# Backend testing and coverage

Use Java 17 and the Maven wrapper from this directory. No running MySQL server or real API credentials are
needed. All commands below use PowerShell; on macOS/Linux replace `.\mvnw.cmd` with `./mvnw`.

## Database-free unit tests

```powershell
.\mvnw.cmd test "-Dtest=*UnitTest"
```

This selection runs the five new unit-test classes only (107 parameterized/test cases):

- `AiServiceUnitTest`: strict JSON request construction, copywriting payload, provider failures, invalid JSON,
  filter normalization, capacity limits, and supported date formats.
- `BookingServiceUnitTest`: invalid dates/capacity/profile, reusable ID documents, server-calculated totals,
  booking ownership, moderation, cancellation idempotency, and notification decisions.
- `UserServiceUnitTest`: Google identity synchronization/conflicts, revoked sessions, profile completeness,
  metadata limits, and ID-replacement cleanup on commit/rollback.
- `JwtAuthenticationConverterUnitTest` and `JwtAudienceValidatorUnitTest`: role normalization, principal
  fallback, and audience acceptance/rejection.

New service tests use `MockitoExtension`, `@InjectMocks`, and `@Mock` dependencies. They do not start Spring,
connect to a database, make real HTTP calls, or write identity files. Transaction cleanup callbacks are
exercised in memory. The security helpers have no external dependencies.

Expected AI failure-path tests deliberately log errors; check Maven's final test counts and build result,
not the presence of an ERROR log line alone.

## Full regression suite and coverage

```powershell
.\mvnw.cmd clean verify
```

This also retains and runs the existing regression/integration tests, which use the isolated H2 configuration
in `src/test/resources/application.yml`. No new integration tests were added.

JaCoCo 0.8.11 attaches its agent before tests and generates these files during `verify`:

- `target/site/jacoco/index.html`: browsable coverage report.
- `target/site/jacoco/jacoco.xml`: SonarCloud coverage input.
- `target/site/jacoco/jacoco.csv`: per-class coverage counters.
- `target/surefire-reports/`: test execution results.

The 2026-08-31 clean verification passed all **173 tests** (66 existing + 107 new). Full-suite results:

| Metric | Baseline | After new unit tests |
| --- | ---: | ---: |
| Lines | 88.30% | 94.60% (1,156 / 1,222) |
| Branches | 66.74% | 83.37% (386 / 463) |

These are **full-suite JaCoCo metrics**, not coverage from the new unit tests alone and not a verified
SonarCloud Quality Gate result. No production-code coverage exclusions or reduced thresholds were added.
The Maven build generates the report; it does not enforce an additional local 80% threshold.

Use `clean verify` for a publishable report. A selective test run can produce partial coverage, and `test`
alone does not regenerate the HTML/XML reports. Do not use `-DskipTests` for the coverage build.

## Manual SonarCloud upload

The active SonarCloud project key is `mrlachir_keyrak_api` in organization `mrlachir`.
Use this key for manual analysis; the root properties and GitHub workflow use the same key.

Set `SONAR_TOKEN` securely in your terminal environment or CI secret store. Do not commit it, put it in
project configuration files, or share it in screenshots/debug logs. The Maven scanner reads this environment
variable directly. Then, from `backend/`:

```powershell
if (-not $env:SONAR_TOKEN) { throw 'Set SONAR_TOKEN securely before running the upload.' }
.\mvnw.cmd clean verify org.sonarsource.scanner.maven:sonar-maven-plugin:sonar "-Dsonar.projectKey=mrlachir_keyrak_api" "-Dsonar.organization=mrlachir" "-Dsonar.host.url=https://sonarcloud.io" "-Dsonar.coverage.jacoco.xmlReportPaths=target/site/jacoco/jacoco.xml"
```

No upload was run as part of this coverage change. The command intentionally omits `sonar.branch.name`;
confirm the dashboard's main branch and your intended branch analysis before adding a branch override.

The [Maven scanner uses POM/command-line settings, not `sonar-project.properties`](https://docs.sonarsource.com/sonarqube-cloud/analyzing-source-code/scanners/sonarscanner-for-maven).
The root GitHub workflow uses the standalone scanner instead: it now runs Maven `clean verify` before
scanning, and the root properties explicitly point to `backend/target/site/jacoco/jacoco.xml`.
The CI token is the repository's `SONAR_TOKEN` secret and must have analysis access to this project.

## Coverage does not fix scanner authentication or quality-profile errors

SonarCloud [imports a generated JaCoCo XML report](https://docs.sonarsource.com/sonarqube-cloud/enriching/test-coverage/java-test-coverage);
it does not generate coverage itself. A failure loading quality profiles is a separate scanner/server issue.
If it persists, capture the actual failing HTTP status and `Caused by` block with secrets redacted.

`Not computed` can mean only one completed analysis exists or that the project's new-code definition is
missing. A new XML file alone does not establish that configuration. Check the dashboard's new-code settings
and completed analyses. Passing overall coverage also does not prove new-code coverage or the other quality
conditions pass. See [SonarCloud quality gates](https://docs.sonarsource.com/sonarqube-cloud/standards/quality-gates).
