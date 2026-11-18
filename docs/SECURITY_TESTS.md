# Security tests (Phase 14)

Coverage against the approved plan §24 matrix. Integration tests use Testcontainers and **skip when Docker is unavailable**.

## Matrix

| # | Requirement | Primary coverage |
|---|---|---|
| 1 | Revoked family invalidates access (non-denylisted JTI) | `JwtAuthenticationFilterTest#revokedFamilyRejectsAccessEvenWhenJtiNotDenylisted`; `SecurityMatrixIntegrationTest#revokedFamilyBlocksAccessWithoutDenylistingJti` |
| 2 | Refresh replay revokes family + invalidates prior access | `RefreshServiceTest#reusedRefreshRevokesFamilyAndFails`; `SecurityMatrixIntegrationTest#refreshReuseRevokesFamilyAndInvalidatesPriorAccess` |
| 3 | Logout: expired access + valid refresh | `LogoutServiceTest#expiredAccessWithValidRefreshStillRevokesRefreshFamily` |
| 4 | Logout: invalid refresh alone → revoke nothing, 204 | `LogoutServiceTest#invalidRefreshAloneRevokesNothing`; `AuthenticationIntegrationTest#logoutWithInvalidRefreshAloneStillReturns204` |
| 5 | Logout: invalid refresh + valid access → access family only | `LogoutServiceTest#invalidRefreshWithValidAccessRevokesAccessFamilyOnly` |
| 6 | Logout: mismatched valid cookies → revoke neither | `LogoutServiceTest#mismatchedValidAccessAndRefreshRevokesNeither`; `#mismatchedDifferentUsersRevokesNeither` |
| 7 | Logout: matching pair → family revoked, 204 | `SecurityMatrixIntegrationTest#logoutMatchingPairRevokesFamilyInDatabase`; `AuthenticationIntegrationTest#logoutWithValidRefreshReturns204AndClearsCookies` |
| 8 | Outbox AAD recipient tamper | `OutboxCryptoServiceTest#recipientTamperingFailsDecrypt` |
| 9 | Wrong JWT type on endpoints | `JwtServiceTest` (parser); `SecurityMatrixIntegrationTest#accessJwtRejectedOnRefreshEndpoint`; `#refreshJwtRejectedOnOrdinaryApi` |
| 10 | Non–SUPER_ADMIN cannot grant SUPER_ADMIN | `RoleAssignmentServiceTest`; `SuperAdminGrantSecurityIntegrationTest` |
| 11 | TOTP replay | `TotpServiceTest`; `MfaTotpVerifierTest#acceptAdvancesLastTotpStep` |
| 12 | TOTP concurrency | `MfaTotpVerifierTest#concurrentAcceptOfSameStepExactlyOneWinner` |
| 13 | Fail-closed **401** vs **503** | `JwtAuthenticationFilterTest` (family/denylist/user DB → **503**; tv mismatch → **401**); login **401** in `AuthenticationIntegrationTest` |
| 14 | Audit grants + retention + default privileges | `DatabaseRoleIntegrationTest` (no UPDATE/DELETE, no ownership, retention EXECUTE, default DML on new owner table) |

## Additional hardening coverage

- CSRF / Origin: `CsrfCorsIntegrationTest`, `OriginAllowlistFilterTest`
- `must_change_password` gate: `AuthenticationIntegrationTest`
- Bootstrap idempotency: `BootstrapAdminIntegrationTest`
- Soft-delete restore keeps roles: `UserAccountServiceIntegrationTest#softDeleteAndRestorePreservesRoleAssignments`
- Cookie clear attributes: `SecurityMatrixIntegrationTest#logoutClearsCookiesWithMatchingAttributes`
- Mass-assignment safe admin DTOs: `AdminUserMassAssignmentWebMvcTest`

## Run

```bash
cd backend
mvn test                 # unit + WebMvc always; Testcontainers when Docker is up
```
