(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-INVALID-CHALLENGE u101)
(define-constant ERR-INVALID-AMOUNT u102)
(define-constant ERR-INVALID-STATUS u103)
(define-constant ERR-INSUFFICIENT-BALANCE u104)
(define-constant ERR-CHALLENGE-NOT-FOUND u105)
(define-constant ERR-USER-NOT-REGISTERED u106)
(define-constant ERR-DEPOSIT-LOCKED u107)
(define-constant ERR-WITHDRAW-NOT-ALLOWED u108)
(define-constant ERR-PENALTY-NOT-APPLICABLE u109)
(define-constant ERR-INVALID-TIMESTAMP u110)
(define-constant ERR-AUTHORITY-NOT-VERIFIED u111)
(define-constant ERR-INVALID-PENALTY-RATE u112)
(define-constant ERR-INVALID-REWARD-RATE u113)
(define-constant ERR-MAX-DEPOSITS-EXCEEDED u114)
(define-constant ERR-INVALID-USER u115)
(define-constant ERR-INVALID-REWARD-TOKEN u116)
(define-constant ERR-TRANSFER-FAILED u117)
(define-constant ERR-INVALID-GOVERNANCE u118)
(define-constant ERR-INVALID-HABIT-TRACKER u119)
(define-constant ERR-INVALID-ORACLE u120)
(define-constant ERR-ORACLE-NOT-VERIFIED u121)
(define-constant ERR-INVALID-MIN-DEPOSIT u122)
(define-constant ERR-INVALID-MAX-DEPOSIT u123)
(define-constant ERR-CHALLENGE-EXPIRED u124)
(define-constant ERR-CHALLENGE-NOT-STARTED u125)
(define-constant ERR-USER-ALREADY-DEPOSITED u126)
(define-constant ERR-INVALID-LOCK-PERIOD u127)
(define-constant ERR-LOCK-PERIOD-NOT-ENDED u128)
(define-constant ERR-REWARD-NOT-AVAILABLE u129)
(define-constant ERR-PENALTY-ALREADY_ENFORCED u130)

(define-data-var next-vault-id uint u0)
(define-data-var max-deposits-per-challenge uint u1000)
(define-data-var deposit-fee uint u100)
(define-data-var authority-contract principal tx-sender)
(define-data-var reward-token-contract principal tx-sender)
(define-data-var governance-contract principal tx-sender)
(define-data-var habit-tracker-contract principal tx-sender)
(define-data-var oracle-contract principal tx-sender)

(define-map challenge-vaults
  { challenge-id: uint, user: principal }
  {
    locked-amount: uint,
    deposit-time: uint,
    status: (string-ascii 20),
    penalty-enforced: bool,
    reward-claimed: bool,
    lock-period: uint
  }
)

(define-map challenge-configs
  uint
  {
    min-deposit: uint,
    max-deposit: uint,
    penalty-rate: uint,
    reward-rate: uint,
    lock-duration: uint,
    start-time: uint,
    end-time: uint,
    active: bool
  }
)

(define-map user-deposits
  principal
  uint
)

(define-read-only (get-vault (challenge-id uint) (user principal))
  (map-get? challenge-vaults { challenge-id: challenge-id, user: user })
)

(define-read-only (get-challenge-config (challenge-id uint))
  (map-get? challenge-configs challenge-id)
)

(define-read-only (get-user-deposit-count (user principal))
  (default-to u0 (map-get? user-deposits user))
)

(define-private (validate-amount (amount uint))
  (if (> amount u0)
      (ok true)
      (err ERR-INVALID-AMOUNT))
)

(define-private (validate-challenge-id (id uint))
  (if (> id u0)
      (ok true)
      (err ERR-INVALID-CHALLENGE))
)

(define-private (validate-status (status (string-ascii 20)))
  (if (or (is-eq status "active") (is-eq status "completed") (is-eq status "failed"))
      (ok true)
      (err ERR-INVALID-STATUS))
)

(define-private (validate-timestamp (ts uint))
  (if (>= ts block-height)
      (ok true)
      (err ERR-INVALID-TIMESTAMP))
)

(define-private (validate-penalty-rate (rate uint))
  (if (<= rate u100)
      (ok true)
      (err ERR-INVALID-PENALTY-RATE))
)

(define-private (validate-reward-rate (rate uint))
  (if (<= rate u200)
      (ok true)
      (err ERR-INVALID-REWARD-RATE))
)

(define-private (validate-min-deposit (min uint))
  (if (> min u0)
      (ok true)
      (err ERR-INVALID-MIN-DEPOSIT))
)

(define-private (validate-max-deposit (max uint))
  (if (> max u0)
      (ok true)
      (err ERR-INVALID-MAX-DEPOSIT))
)

(define-private (validate-lock-period (period uint))
  (if (> period u0)
      (ok true)
      (err ERR-INVALID-LOCK-PERIOD))
)

(define-private (validate-user (user principal))
  (if (not (is-eq user tx-sender))
      (ok true)
      (err ERR-INVALID-USER))
)

(define-private (is-challenge-active (challenge-id uint))
  (let ((config (unwrap! (get-challenge-config challenge-id) (err ERR-CHALLENGE-NOT-FOUND))))
    (and (get active config) (>= block-height (get start-time config)) (<= block-height (get end-time config)))
  )
)

(define-private (has-user-deposited (challenge-id uint) (user principal))
  (is-some (get-vault challenge-id user))
)

(define-private (is-habit-completed (challenge-id uint) (user principal))
  (ok true)
)

(define-private (calculate-penalty (amount uint) (rate uint))
  (/ (* amount rate) u100)
)

(define-private (calculate-reward (amount uint) (rate uint))
  (/ (* amount rate) u100)
)

(define-public (set-authority-contract (new-authority principal))
  (begin
    (asserts! (is-eq tx-sender contract-caller) (err ERR-NOT-AUTHORIZED))
    (var-set authority-contract new-authority)
    (ok true)
  )
)

(define-public (set-reward-token-contract (new-reward principal))
  (begin
    (asserts! (is-eq tx-sender (var-get authority-contract)) (err ERR-NOT-AUTHORIZED))
    (var-set reward-token-contract new-reward)
    (ok true)
  )
)

(define-public (set-governance-contract (new-gov principal))
  (begin
    (asserts! (is-eq tx-sender (var-get authority-contract)) (err ERR-NOT-AUTHORIZED))
    (var-set governance-contract new-gov)
    (ok true)
  )
)

(define-public (set-habit-tracker-contract (new-tracker principal))
  (begin
    (asserts! (is-eq tx-sender (var-get authority-contract)) (err ERR-NOT-AUTHORIZED))
    (var-set habit-tracker-contract new-tracker)
    (ok true)
  )
)

(define-public (set-oracle-contract (new-oracle principal))
  (begin
    (asserts! (is-eq tx-sender (var-get authority-contract)) (err ERR-NOT-AUTHORIZED))
    (var-set oracle-contract new-oracle)
    (ok true)
  )
)

(define-public (configure-challenge
  (challenge-id uint)
  (min-deposit uint)
  (max-deposit uint)
  (penalty-rate uint)
  (reward-rate uint)
  (lock-duration uint)
  (start-time uint)
  (end-time uint)
)
  (begin
    (asserts! (is-eq tx-sender (var-get authority-contract)) (err ERR-NOT-AUTHORIZED))
    (try! (validate-challenge-id challenge-id))
    (try! (validate-min-deposit min-deposit))
    (try! (validate-max-deposit max-deposit))
    (try! (validate-penalty-rate penalty-rate))
    (try! (validate-reward-rate reward-rate))
    (try! (validate-lock-period lock-duration))
    (try! (validate-timestamp start-time))
    (try! (validate-timestamp end-time))
    (asserts! (> end-time start-time) (err ERR-INVALID-TIMESTAMP))
    (map-set challenge-configs challenge-id
      {
        min-deposit: min-deposit,
        max-deposit: max-deposit,
        penalty-rate: penalty-rate,
        reward-rate: reward-rate,
        lock-duration: lock-duration,
        start-time: start-time,
        end-time: end-time,
        active: true
      }
    )
    (ok true)
  )
)

(define-public (deposit-funds (challenge-id uint) (amount uint))
  (let (
        (config (unwrap! (get-challenge-config challenge-id) (err ERR-CHALLENGE-NOT-FOUND)))
        (user tx-sender)
        (current-count (get-user-deposit-count user))
      )
    (asserts! (is-challenge-active challenge-id) (err ERR-CHALLENGE-NOT-STARTED))
    (asserts! (not (has-user-deposited challenge-id user)) (err ERR-USER-ALREADY-DEPOSITED))
    (try! (validate-amount amount))
    (asserts! (>= amount (get min-deposit config)) (err ERR-INVALID_MIN_DEPOSIT))
    (asserts! (<= amount (get max-deposit config)) (err ERR-INVALID_MAX_DEPOSIT))
    (asserts! (< current-count (var-get max-deposits-per-challenge)) (err ERR-MAX-DEPOSITS-EXCEEDED))
    (try! (stx-transfer? amount tx-sender (as-contract tx-sender)))
    (map-set challenge-vaults { challenge-id: challenge-id, user: user }
      {
        locked-amount: amount,
        deposit-time: block-height,
        status: "active",
        penalty-enforced: false,
        reward-claimed: false,
        lock-period: (get lock-duration config)
      }
    )
    (map-set user-deposits user (+ current-count u1))
    (print { event: "deposit-made", challenge-id: challenge-id, user: user, amount: amount })
    (ok true)
  )
)

(define-public (withdraw-on-completion (challenge-id uint))
  (let (
        (vault (unwrap! (get-vault challenge-id tx-sender) (err ERR-CHALLENGE-NOT-FOUND)))
        (config (unwrap! (get-challenge-config challenge-id) (err ERR-CHALLENGE-NOT-FOUND)))
        (user tx-sender)
        (locked-amount (get locked-amount vault))
        (deposit-time (get deposit-time vault))
        (lock-period (get lock-period vault))
      )
    (asserts! (is-eq (get status vault) "active") (err ERR-INVALID-STATUS))
    (asserts! (>= block-height (+ deposit-time lock-period)) (err ERR-LOCK-PERIOD-NOT-ENDED))
    (asserts! (unwrap! (is-habit-completed challenge-id user) (err ERR-INVALID-HABIT-TRACKER)) (err ERR-WITHDRAW-NOT-ALLOWED))
    (let ((reward (calculate-reward locked-amount (get reward-rate config))))
      (asserts! (> reward u0) (err ERR-REWARD-NOT-AVAILABLE))
      (try! (as-contract (stx-transfer? locked-amount tx-sender user)))
      (map-set challenge-vaults { challenge-id: challenge-id, user: user }
        (merge vault { status: "completed", reward-claimed: true })
      )
      (print { event: "withdraw-completed", challenge-id: challenge-id, user: user, amount: locked-amount, reward: reward })
      (ok reward)
    )
  )
)

(define-public (enforce-penalty (challenge-id uint) (user principal))
  (let (
        (vault (unwrap! (get-vault challenge-id user) (err ERR-CHALLENGE-NOT-FOUND)))
        (config (unwrap! (get-challenge-config challenge-id) (err ERR-CHALLENGE-NOT-FOUND)))
        (locked-amount (get locked-amount vault))
      )
    (asserts! (is-eq tx-sender (var-get governance-contract)) (err ERR-NOT-AUTHORIZED))
    (asserts! (is-eq (get status vault) "active") (err ERR-INVALID-STATUS))
    (asserts! (not (get penalty-enforced vault)) (err ERR-PENALTY-ALREADY_ENFORCED))
    (let ((penalty (calculate-penalty locked-amount (get penalty-rate config))))
      (try! (as-contract (stx-transfer? penalty tx-sender (var-get governance-contract))))
      (let ((remaining (- locked-amount penalty)))
        (try! (as-contract (stx-transfer? remaining tx-sender user)))
        (map-set challenge-vaults { challenge-id: challenge-id, user: user }
          (merge vault { status: "failed", penalty-enforced: true })
        )
        (print { event: "penalty-enforced", challenge-id: challenge-id, user: user, penalty: penalty })
        (ok penalty)
      )
    )
  )
)

(define-public (claim-reward (challenge-id uint))
  (let (
        (vault (unwrap! (get-vault challenge-id tx-sender) (err ERR-CHALLENGE-NOT-FOUND)))
        (config (unwrap! (get-challenge-config challenge-id) (err ERR-CHALLENGE-NOT-FOUND)))
        (user tx-sender)
      )
    (asserts! (is-eq (get status vault) "completed") (err ERR-INVALID-STATUS))
    (asserts! (not (get reward-claimed vault)) (err ERR-REWARD-NOT-AVAILABLE))
    (let ((reward (calculate-reward (get locked-amount vault) (get reward-rate config))))
      (try! (contract-call? (var-get reward-token-contract) transfer reward tx-sender user none))
      (map-set challenge-vaults { challenge-id: challenge-id, user: user }
        (merge vault { reward-claimed: true })
      )
      (print { event: "reward-claimed", challenge-id: challenge-id, user: user, reward: reward })
      (ok reward)
    )
  )
)

(define-public (deactivate-challenge (challenge-id uint))
  (begin
    (asserts! (is-eq tx-sender (var-get authority-contract)) (err ERR-NOT-AUTHORIZED))
    (let ((config (unwrap! (get-challenge-config challenge-id) (err ERR-CHALLENGE-NOT-FOUND))))
      (map-set challenge-configs challenge-id (merge config { active: false }))
      (ok true)
    )
  )
)

(define-public (get-vault-balance (challenge-id uint) (user principal))
  (ok (default-to u0 (get locked-amount (get-vault challenge-id user))))
)

(define-public (check-deposit-status (challenge-id uint) (user principal))
  (ok (get status (unwrap! (get-vault challenge-id user) (err ERR-CHALLENGE-NOT-FOUND))))
)

(define-public (get-penalty-rate (challenge-id uint))
  (ok (get penalty-rate (unwrap! (get-challenge-config challenge-id) (err ERR-CHALLENGE-NOT-FOUND))))
)

(define-public (get-reward-rate (challenge-id uint))
  (ok (get reward-rate (unwrap! (get-challenge-config challenge-id) (err ERR-CHALLENGE-NOT-FOUND))))
)

(define-public (get-lock-duration (challenge-id uint))
  (ok (get lock-duration (unwrap! (get-challenge-config challenge-id) (err ERR-CHALLENGE-NOT-FOUND))))
)