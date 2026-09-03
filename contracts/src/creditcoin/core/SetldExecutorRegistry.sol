// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @title SetldExecutorRegistry
/// @notice Executor identity + Ethereum source-address binding (PRD 12.1, 15.2).
///         An executor is identified by its owning Creditcoin address. It binds one or more
///         Sepolia execution addresses via EIP-712 signatures that include chain id, this
///         contract, executor id, nonce and expiry so a signature cannot be replayed across
///         chains or deployments. Historical bindings are preserved for record integrity;
///         a binding used by an active mandate cannot be retired until SetldCore releases it.
contract SetldExecutorRegistry {
    struct Binding {
        address sourceAddress;
        uint64 boundAtBlock;
        uint64 retiredAtBlock; // 0 while active
    }

    bytes32 public immutable DOMAIN_SEPARATOR;
    bytes32 public constant BINDING_TYPEHASH = keccak256(
        "SourceAddressBinding(bytes32 executorId,address creditcoinAccount,uint256 sepoliaChainId,address sourceAddress,address deployment,uint256 nonce,uint256 expiry)"
    );
    uint256 public constant SEPOLIA_CHAIN_ID = 11155111;

    address public immutable core; // SetldCore, the only caller that can lock/release a binding

    mapping(address => bytes32) public executorIdOf; // owner => id (0 until registered)
    mapping(bytes32 => address) public ownerOf;
    mapping(bytes32 => Binding[]) private _bindings; // executorId => history
    mapping(bytes32 => uint256) public activeBindingIndex; // executorId => index+1 into _bindings (0 = none)
    mapping(address => bytes32) public boundExecutorOf; // sourceAddress => executorId currently bound
    mapping(bytes32 => uint256) public nonces; // executorId => next nonce
    mapping(bytes32 => uint256) public activeMandateCount; // executorId => open obligations pinned to current binding

    error AlreadyRegistered();
    error NotRegistered();
    error BadSignature();
    error Expired();
    error WrongNonce(uint256 expected, uint256 got);
    error SourceAddressTaken(address sourceAddress);
    error NoActiveBinding();
    error BindingLockedByActiveMandate(uint256 count);
    error NotCore();

    event ExecutorRegistered(bytes32 indexed executorId, address indexed owner);
    event SourceAddressBound(bytes32 indexed executorId, address indexed sourceAddress, uint256 index);
    event SourceAddressRetired(bytes32 indexed executorId, address indexed sourceAddress, uint256 index);

    constructor(address _core) {
        core = _core;
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256("setld"),
                keccak256("1"),
                block.chainid,
                address(this)
            )
        );
    }

    modifier onlyCore() {
        if (msg.sender != core) revert NotCore();
        _;
    }

    function register() external returns (bytes32 executorId) {
        if (executorIdOf[msg.sender] != bytes32(0)) revert AlreadyRegistered();
        executorId = keccak256(abi.encodePacked(block.chainid, address(this), msg.sender));
        executorIdOf[msg.sender] = executorId;
        ownerOf[executorId] = msg.sender;
        emit ExecutorRegistered(executorId, msg.sender);
    }

    /// @notice Bind `sourceAddress` proven by an EIP-712 signature from that address.
    function bindSourceAddress(address sourceAddress, uint256 nonce, uint256 expiry, bytes calldata signature)
        external
    {
        bytes32 executorId = executorIdOf[msg.sender];
        if (executorId == bytes32(0)) revert NotRegistered();
        if (block.timestamp > expiry) revert Expired();
        if (nonce != nonces[executorId]) revert WrongNonce(nonces[executorId], nonce);
        if (boundExecutorOf[sourceAddress] != bytes32(0)) revert SourceAddressTaken(sourceAddress);

        bytes32 structHash = keccak256(
            abi.encode(
                BINDING_TYPEHASH, executorId, msg.sender, SEPOLIA_CHAIN_ID, sourceAddress, address(this), nonce, expiry
            )
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash));
        if (_recover(digest, signature) != sourceAddress) revert BadSignature();

        nonces[executorId] = nonce + 1;

        // retire the current active binding (if any) — allowed only when nothing pins it
        uint256 activeIdx = activeBindingIndex[executorId];
        if (activeIdx != 0) {
            if (activeMandateCount[executorId] != 0) revert BindingLockedByActiveMandate(activeMandateCount[executorId]);
            Binding storage prev = _bindings[executorId][activeIdx - 1];
            prev.retiredAtBlock = uint64(block.number);
            boundExecutorOf[prev.sourceAddress] = bytes32(0);
            emit SourceAddressRetired(executorId, prev.sourceAddress, activeIdx - 1);
        }

        _bindings[executorId].push(Binding(sourceAddress, uint64(block.number), 0));
        activeBindingIndex[executorId] = _bindings[executorId].length;
        boundExecutorOf[sourceAddress] = executorId;
        emit SourceAddressBound(executorId, sourceAddress, _bindings[executorId].length - 1);
    }

    /// @notice Current active source address for an executor, reverts if none.
    function activeSourceAddress(bytes32 executorId) public view returns (address) {
        uint256 idx = activeBindingIndex[executorId];
        if (idx == 0) revert NoActiveBinding();
        return _bindings[executorId][idx - 1].sourceAddress;
    }

    function bindingHistory(bytes32 executorId) external view returns (Binding[] memory) {
        return _bindings[executorId];
    }

    /// @notice Snapshot the binding at a given block for a historical record (PRD 12.1).
    function sourceAddressAt(bytes32 executorId, uint64 blockNumber) external view returns (address) {
        Binding[] storage b = _bindings[executorId];
        for (uint256 i = b.length; i > 0; i--) {
            Binding storage entry = b[i - 1];
            if (entry.boundAtBlock <= blockNumber && (entry.retiredAtBlock == 0 || entry.retiredAtBlock > blockNumber)) {
                return entry.sourceAddress;
            }
        }
        revert NoActiveBinding();
    }

    // --- SetldCore obligation locking ---

    function lockForMandate(bytes32 executorId) external onlyCore {
        activeMandateCount[executorId] += 1;
    }

    function releaseFromMandate(bytes32 executorId) external onlyCore {
        if (activeMandateCount[executorId] > 0) activeMandateCount[executorId] -= 1;
    }

    function _recover(bytes32 digest, bytes calldata sig) private pure returns (address) {
        if (sig.length != 65) revert BadSignature();
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := calldataload(sig.offset)
            s := calldataload(add(sig.offset, 32))
            v := byte(0, calldataload(add(sig.offset, 64)))
        }
        if (uint256(s) > 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0) revert BadSignature();
        address signer = ecrecover(digest, v, r, s);
        if (signer == address(0)) revert BadSignature();
        return signer;
    }
}
