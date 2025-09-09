import { describe, it, expect, beforeEach } from "vitest";
import { uintCV } from "@stacks/transactions";

const ERR_NOT_AUTHORIZED = 100;
const ERR_INVALID_CHALLENGE = 101;
const ERR_INVALID_AMOUNT = 102;
const ERR_INVALID_STATUS = 103;
const ERR_CHALLENGE_NOT_FOUND = 105;
const ERR_USER_ALREADY_DEPOSITED = 126;
const ERR_INVALID_MIN_DEPOSIT = 122;
const ERR_INVALID_MAX_DEPOSIT = 123;
const ERR_MAX_DEPOSITS_EXCEEDED = 114;
const ERR_LOCK_PERIOD_NOT_ENDED = 128;
const ERR_REWARD_NOT_AVAILABLE = 129;
const ERR_PENALTY_ALREADY_ENFORCED = 130;
const ERR_INVALID_PENALTY_RATE = 112;
const ERR_INVALID_REWARD_RATE = 113;
const ERR_INVALID_LOCK_PERIOD = 127;
const ERR_CHALLENGE_NOT_STARTED = 125;

interface Vault {
  lockedAmount: number;
  depositTime: number;
  status: string;
  penaltyEnforced: boolean;
  rewardClaimed: boolean;
  lockPeriod: number;
}

interface ChallengeConfig {
  minDeposit: number;
  maxDeposit: number;
  penaltyRate: number;
  rewardRate: number;
  lockDuration: number;
  startTime: number;
  endTime: number;
  active: boolean;
}

interface Result<T> {
  ok: boolean;
  value: T;
}

class SavingsVaultMock {
  state: {
    nextVaultId: number;
    maxDepositsPerChallenge: number;
    depositFee: number;
    authorityContract: string;
    rewardTokenContract: string;
    governanceContract: string;
    habitTrackerContract: string;
    oracleContract: string;
    challengeVaults: Map<string, Vault>;
    challengeConfigs: Map<number, ChallengeConfig>;
    userDeposits: Map<string, number>;
  } = {
    nextVaultId: 0,
    maxDepositsPerChallenge: 1000,
    depositFee: 100,
    authorityContract: "ST1TEST",
    rewardTokenContract: "ST1TEST",
    governanceContract: "ST1TEST",
    habitTrackerContract: "ST1TEST",
    oracleContract: "ST1TEST",
    challengeVaults: new Map(),
    challengeConfigs: new Map(),
    userDeposits: new Map(),
  };
  blockHeight: number = 0;
  caller: string = "ST1TEST";
  stxTransfers: Array<{ amount: number; from: string; to: string }> = [];
  tokenTransfers: Array<{ amount: number; from: string; to: string }> = [];

  constructor() {
    this.reset();
  }

  reset() {
    this.state = {
      nextVaultId: 0,
      maxDepositsPerChallenge: 1000,
      depositFee: 100,
      authorityContract: "ST1TEST",
      rewardTokenContract: "ST1TEST",
      governanceContract: "ST1TEST",
      habitTrackerContract: "ST1TEST",
      oracleContract: "ST1TEST",
      challengeVaults: new Map(),
      challengeConfigs: new Map(),
      userDeposits: new Map(),
    };
    this.blockHeight = 0;
    this.caller = "ST1TEST";
    this.stxTransfers = [];
    this.tokenTransfers = [];
  }

  private getVaultKey(challengeId: number, user: string): string {
    return `${challengeId}-${user}`;
  }

  configureChallenge(
    challengeId: number,
    minDeposit: number,
    maxDeposit: number,
    penaltyRate: number,
    rewardRate: number,
    lockDuration: number,
    startTime: number,
    endTime: number
  ): Result<number> {
    if (this.caller !== this.state.authorityContract) return { ok: false, value: ERR_NOT_AUTHORIZED };
    if (challengeId <= 0) return { ok: false, value: ERR_INVALID_CHALLENGE };
    if (minDeposit <= 0) return { ok: false, value: ERR_INVALID_MIN_DEPOSIT };
    if (maxDeposit <= 0) return { ok: false, value: ERR_INVALID_MAX_DEPOSIT };
    if (penaltyRate > 100) return { ok: false, value: ERR_INVALID_PENALTY_RATE };
    if (rewardRate > 200) return { ok: false, value: ERR_INVALID_REWARD_RATE };
    if (lockDuration <= 0) return { ok: false, value: ERR_INVALID_LOCK_PERIOD };
    if (startTime < this.blockHeight) return { ok: false, value: ERR_INVALID_STATUS };
    if (endTime < this.blockHeight) return { ok: false, value: ERR_INVALID_STATUS };
    if (endTime <= startTime) return { ok: false, value: ERR_INVALID_STATUS };

    this.state.challengeConfigs.set(challengeId, {
      minDeposit,
      maxDeposit,
      penaltyRate,
      rewardRate,
      lockDuration,
      startTime,
      endTime,
      active: true,
    });
    return { ok: true, value: 0 };
  }

  depositFunds(challengeId: number, amount: number): Result<number> {
    const config = this.state.challengeConfigs.get(challengeId);
    if (!config) return { ok: false, value: ERR_CHALLENGE_NOT_FOUND };
    if (!config.active || this.blockHeight < config.startTime || this.blockHeight > config.endTime) return { ok: false, value: ERR_CHALLENGE_NOT_STARTED };
    const key = this.getVaultKey(challengeId, this.caller);
    if (this.state.challengeVaults.has(key)) return { ok: false, value: ERR_USER_ALREADY_DEPOSITED };
    if (amount <= 0) return { ok: false, value: ERR_INVALID_AMOUNT };
    if (amount < config.minDeposit) return { ok: false, value: ERR_INVALID_MIN_DEPOSIT };
    if (amount > config.maxDeposit) return { ok: false, value: ERR_INVALID_MAX_DEPOSIT };
    const currentCount = this.state.userDeposits.get(this.caller) || 0;
    if (currentCount >= this.state.maxDepositsPerChallenge) return { ok: false, value: ERR_MAX_DEPOSITS_EXCEEDED };

    this.stxTransfers.push({ amount, from: this.caller, to: "contract" });
    this.state.challengeVaults.set(key, {
      lockedAmount: amount,
      depositTime: this.blockHeight,
      status: "active",
      penaltyEnforced: false,
      rewardClaimed: false,
      lockPeriod: config.lockDuration,
    });
    this.state.userDeposits.set(this.caller, currentCount + 1);
    return { ok: true, value: 0 };
  }

  withdrawOnCompletion(challengeId: number): Result<number> {
    const key = this.getVaultKey(challengeId, this.caller);
    const vault = this.state.challengeVaults.get(key);
    if (!vault) return { ok: false, value: ERR_CHALLENGE_NOT_FOUND };
    const config = this.state.challengeConfigs.get(challengeId);
    if (!config) return { ok: false, value: ERR_CHALLENGE_NOT_FOUND };
    if (vault.status !== "active") return { ok: false, value: ERR_INVALID_STATUS };
    if (this.blockHeight < vault.depositTime + vault.lockPeriod) return { ok: false, value: ERR_LOCK_PERIOD_NOT_ENDED };
    const reward = Math.floor((vault.lockedAmount * config.rewardRate) / 100);
    if (reward <= 0) return { ok: false, value: ERR_REWARD_NOT_AVAILABLE };

    this.stxTransfers.push({ amount: vault.lockedAmount, from: "contract", to: this.caller });
    this.state.challengeVaults.set(key, { ...vault, status: "completed", rewardClaimed: false });
    return { ok: true, value: reward };
  }

  enforcePenalty(challengeId: number, user: string): Result<number> {
    if (this.caller !== this.state.governanceContract) return { ok: false, value: ERR_NOT_AUTHORIZED };
    const key = this.getVaultKey(challengeId, user);
    const vault = this.state.challengeVaults.get(key);
    if (!vault) return { ok: false, value: ERR_CHALLENGE_NOT_FOUND };
    const config = this.state.challengeConfigs.get(challengeId);
    if (!config) return { ok: false, value: ERR_CHALLENGE_NOT_FOUND };
    if (vault.status !== "active") return { ok: false, value: ERR_INVALID_STATUS };
    if (vault.penaltyEnforced) return { ok: false, value: ERR_PENALTY_ALREADY_ENFORCED };

    const penalty = Math.floor((vault.lockedAmount * config.penaltyRate) / 100);
    const remaining = vault.lockedAmount - penalty;
    this.stxTransfers.push({ amount: penalty, from: "contract", to: this.state.governanceContract });
    this.stxTransfers.push({ amount: remaining, from: "contract", to: user });
    this.state.challengeVaults.set(key, { ...vault, status: "failed", penaltyEnforced: true });
    return { ok: true, value: penalty };
  }

  claimReward(challengeId: number): Result<number> {
    const key = this.getVaultKey(challengeId, this.caller);
    const vault = this.state.challengeVaults.get(key);
    if (!vault) return { ok: false, value: ERR_CHALLENGE_NOT_FOUND };
    const config = this.state.challengeConfigs.get(challengeId);
    if (!config) return { ok: false, value: ERR_CHALLENGE_NOT_FOUND };
    if (vault.status !== "completed") return { ok: false, value: ERR_INVALID_STATUS };
    if (vault.rewardClaimed) return { ok: false, value: ERR_REWARD_NOT_AVAILABLE };

    const reward = Math.floor((vault.lockedAmount * config.rewardRate) / 100);
    this.tokenTransfers.push({ amount: reward, from: this.state.rewardTokenContract, to: this.caller });
    this.state.challengeVaults.set(key, { ...vault, rewardClaimed: true });
    return { ok: true, value: reward };
  }

  deactivateChallenge(challengeId: number): Result<number> {
    if (this.caller !== this.state.authorityContract) return { ok: false, value: ERR_NOT_AUTHORIZED };
    const config = this.state.challengeConfigs.get(challengeId);
    if (!config) return { ok: false, value: ERR_CHALLENGE_NOT_FOUND };
    this.state.challengeConfigs.set(challengeId, { ...config, active: false });
    return { ok: true, value: 0 };
  }

  getVaultBalance(challengeId: number, user: string): Result<number> {
    const key = this.getVaultKey(challengeId, user);
    const vault = this.state.challengeVaults.get(key);
    return { ok: true, value: vault ? vault.lockedAmount : 0 };
  }

  checkDepositStatus(challengeId: number, user: string): Result<string> {
    const key = this.getVaultKey(challengeId, user);
    const vault = this.state.challengeVaults.get(key);
    if (!vault) return { ok: false, value: ERR_CHALLENGE_NOT_FOUND.toString() };
    return { ok: true, value: vault.status };
  }

  setAuthorityContract(newAuthority: string): Result<number> {
    if (this.caller !== this.state.authorityContract) return { ok: false, value: ERR_NOT_AUTHORIZED };
    this.state.authorityContract = newAuthority;
    return { ok: true, value: 0 };
  }
}

describe("SavingsVault", () => {
  let contract: SavingsVaultMock;

  beforeEach(() => {
    contract = new SavingsVaultMock();
    contract.reset();
  });

  it("configures a challenge successfully", () => {
    const result = contract.configureChallenge(1, 100, 1000, 10, 20, 30, 10, 100);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(0);
    const config = contract.state.challengeConfigs.get(1);
    expect(config).toEqual({
      minDeposit: 100,
      maxDeposit: 1000,
      penaltyRate: 10,
      rewardRate: 20,
      lockDuration: 30,
      startTime: 10,
      endTime: 100,
      active: true,
    });
  });

  it("rejects configure challenge by unauthorized", () => {
    contract.caller = "ST2FAKE";
    const result = contract.configureChallenge(1, 100, 1000, 10, 20, 30, 10, 100);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_NOT_AUTHORIZED);
  });

  it("parses challenge parameters with Clarity types", () => {
    const challengeId = uintCV(1);
    const minDeposit = uintCV(100);
    const maxDeposit = uintCV(1000);
    expect(challengeId.value).toEqual(BigInt(1));
    expect(minDeposit.value).toEqual(BigInt(100));
    expect(maxDeposit.value).toEqual(BigInt(1000));
  });

  it("deposits funds successfully", () => {
    contract.configureChallenge(1, 100, 1000, 10, 20, 30, 0, 100);
    contract.blockHeight = 50;
    const result = contract.depositFunds(1, 500);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(0);
    expect(contract.stxTransfers).toEqual([{ amount: 500, from: "ST1TEST", to: "contract" }]);
    const vault = contract.state.challengeVaults.get("1-ST1TEST");
    expect(vault).toEqual({
      lockedAmount: 500,
      depositTime: 50,
      status: "active",
      penaltyEnforced: false,
      rewardClaimed: false,
      lockPeriod: 30,
    });
  });

  it("rejects deposit with invalid amount", () => {
    contract.configureChallenge(1, 100, 1000, 10, 20, 30, 0, 100);
    const result = contract.depositFunds(1, 0);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_AMOUNT);
  });

  it("rejects deposit below min", () => {
    contract.configureChallenge(1, 100, 1000, 10, 20, 30, 0, 100);
    const result = contract.depositFunds(1, 50);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_MIN_DEPOSIT);
  });

  it("rejects deposit above max", () => {
    contract.configureChallenge(1, 100, 1000, 10, 20, 30, 0, 100);
    const result = contract.depositFunds(1, 1500);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_MAX_DEPOSIT);
  });

  it("rejects duplicate deposit", () => {
    contract.configureChallenge(1, 100, 1000, 10, 20, 30, 0, 100);
    contract.depositFunds(1, 500);
    const result = contract.depositFunds(1, 500);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_USER_ALREADY_DEPOSITED);
  });

  it("rejects deposit when challenge not started", () => {
    contract.configureChallenge(1, 100, 1000, 10, 20, 30, 100, 200);
    contract.blockHeight = 50;
    const result = contract.depositFunds(1, 500);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_CHALLENGE_NOT_STARTED);
  });

  it("withdraws on completion successfully", () => {
    contract.configureChallenge(1, 100, 1000, 10, 20, 30, 0, 100);
    contract.depositFunds(1, 500);
    contract.blockHeight = 100;
    const result = contract.withdrawOnCompletion(1);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(100);
    expect(contract.stxTransfers[1]).toEqual({ amount: 500, from: "contract", to: "ST1TEST" });
    const vault = contract.state.challengeVaults.get("1-ST1TEST");
    expect(vault?.status).toBe("completed");
    expect(vault?.rewardClaimed).toBe(false);
  });

  it("rejects withdraw before lock end", () => {
    contract.configureChallenge(1, 100, 1000, 10, 20, 30, 0, 100);
    contract.depositFunds(1, 500);
    contract.blockHeight = 20;
    const result = contract.withdrawOnCompletion(1);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_LOCK_PERIOD_NOT_ENDED);
  });

  it("rejects withdraw for non-existent vault", () => {
    contract.configureChallenge(1, 100, 1000, 10, 20, 30, 0, 100);
    const result = contract.withdrawOnCompletion(1);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_CHALLENGE_NOT_FOUND);
  });

  it("enforces penalty successfully", () => {
    contract.configureChallenge(1, 100, 1000, 10, 20, 30, 0, 100);
    contract.depositFunds(1, 500);
    contract.caller = contract.state.governanceContract;
    const result = contract.enforcePenalty(1, "ST1TEST");
    expect(result.ok).toBe(true);
    expect(result.value).toBe(50);
    expect(contract.stxTransfers[1]).toEqual({ amount: 50, from: "contract", to: "ST1TEST" });
    expect(contract.stxTransfers[2]).toEqual({ amount: 450, from: "contract", to: "ST1TEST" });
    const vault = contract.state.challengeVaults.get("1-ST1TEST");
    expect(vault?.status).toBe("failed");
    expect(vault?.penaltyEnforced).toBe(true);
  });

  it("rejects penalty by unauthorized", () => {
    contract.configureChallenge(1, 100, 1000, 10, 20, 30, 0, 100);
    contract.depositFunds(1, 500);
    contract.caller = "ST2FAKE";
    const result = contract.enforcePenalty(1, "ST1TEST");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_NOT_AUTHORIZED);
  });

  it("claims reward successfully", () => {
    contract.configureChallenge(1, 100, 1000, 10, 20, 30, 0, 100);
    contract.depositFunds(1, 500);
    contract.blockHeight = 100;
    contract.withdrawOnCompletion(1);
    const result = contract.claimReward(1);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(100);
    expect(contract.tokenTransfers[0]).toEqual({ amount: 100, from: "ST1TEST", to: "ST1TEST" });
    const vault = contract.state.challengeVaults.get("1-ST1TEST");
    expect(vault?.rewardClaimed).toBe(true);
  });

  it("rejects claim reward if not completed", () => {
    contract.configureChallenge(1, 100, 1000, 10, 20, 30, 0, 100);
    contract.depositFunds(1, 500);
    const result = contract.claimReward(1);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_STATUS);
  });

  it("rejects claim reward if already claimed", () => {
    contract.configureChallenge(1, 100, 1000, 10, 20, 30, 0, 100);
    contract.depositFunds(1, 500);
    contract.blockHeight = 100;
    contract.withdrawOnCompletion(1);
    contract.claimReward(1);
    const result = contract.claimReward(1);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_REWARD_NOT_AVAILABLE);
  });

  it("deactivates challenge successfully", () => {
    contract.configureChallenge(1, 100, 1000, 10, 20, 30, 0, 100);
    const result = contract.deactivateChallenge(1);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(0);
    const config = contract.state.challengeConfigs.get(1);
    expect(config?.active).toBe(false);
  });

  it("rejects deactivate challenge by unauthorized", () => {
    contract.configureChallenge(1, 100, 1000, 10, 20, 30, 0, 100);
    contract.caller = "ST2FAKE";
    const result = contract.deactivateChallenge(1);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_NOT_AUTHORIZED);
  });

  it("gets vault balance correctly", () => {
    contract.configureChallenge(1, 100, 1000, 10, 20, 30, 0, 100);
    contract.depositFunds(1, 500);
    const result = contract.getVaultBalance(1, "ST1TEST");
    expect(result.ok).toBe(true);
    expect(result.value).toBe(500);
  });

  it("gets zero balance for non-existent vault", () => {
    contract.configureChallenge(1, 100, 1000, 10, 20, 30, 0, 100);
    const result = contract.getVaultBalance(1, "ST1TEST");
    expect(result.ok).toBe(true);
    expect(result.value).toBe(0);
  });

  it("checks deposit status correctly", () => {
    contract.configureChallenge(1, 100, 1000, 10, 20, 30, 0, 100);
    contract.depositFunds(1, 500);
    const result = contract.checkDepositStatus(1, "ST1TEST");
    expect(result.ok).toBe(true);
    expect(result.value).toBe("active");
  });

  it("rejects check deposit status for non-existent vault", () => {
    contract.configureChallenge(1, 100, 1000, 10, 20, 30, 0, 100);
    const result = contract.checkDepositStatus(1, "ST1TEST");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_CHALLENGE_NOT_FOUND.toString());
  });

  it("sets authority contract successfully", () => {
    const result = contract.setAuthorityContract("ST2TEST");
    expect(result.ok).toBe(true);
    expect(result.value).toBe(0);
    expect(contract.state.authorityContract).toBe("ST2TEST");
  });

  it("rejects set authority contract by unauthorized", () => {
    contract.caller = "ST2FAKE";
    const result = contract.setAuthorityContract("ST3TEST");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_NOT_AUTHORIZED);
  });
});