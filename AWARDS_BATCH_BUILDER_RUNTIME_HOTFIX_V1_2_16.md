# Awards Batch Builder Runtime Hotfix — v1.2.16

## Fixed

- Fixed `optionPayload is not defined` when Awards Manager batch creation reached the normalized admin question projection.
- The synthetic question anchor now uses question-level odds metadata only.
- Per-answer odds continue to come from each QuestionOptions `PayloadJSON` inside the option loop where `optionPayload` is defined.
- Added a runtime regression test that executes the failing normalized-storage projection and verifies question-level and answer-level odds remain distinct.

## Impact

This is a backend runtime hotfix. No Awards event selections or market data need to be rebuilt before retrying; failed questions were reported as 0 built, so the batch can be retried after deployment.
