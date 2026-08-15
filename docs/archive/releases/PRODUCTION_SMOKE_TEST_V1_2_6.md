# Production Smoke Test — v1.2.6

1. Open Admin → External Results Inbox. Confirm the card loads and says Automatic apply OFF.
2. In External Results Hub, approve one mapped FINAL test result and run Deliver Approved Results to App Inbox.
3. In Awards App Admin, select Refresh Status. Confirm READY rows/batch appear.
4. Select Validate Ready. Confirm the batch becomes VALIDATED with no error.
5. For an Awards/prediction category, select Apply Validated. Confirm ExternalResultsInbox becomes APPLIED, CategoryResults contains all category nominees with the correct winner(s), and the category is locked/settled.
6. Repeat delivery of the same result. Validate/apply again and confirm it is treated as already applied instead of creating conflicting duplicate settlement.
7. Deliver a Reality TV Extra Question result. Validate/apply and confirm it becomes STAGED_REALITY and a matching RealityQuestionResultQueue row exists.
8. Deliver a Reality TV elimination result. Validate/apply and confirm it becomes STAGED_REALITY and a matching RealityResultQueue row exists. Finish it through the normal Reality TV one-click finalizer.
9. Confirm an incomplete mapping batch becomes ERROR and is not applied.
10. Confirm no Sports/Racing provider is accepted through this inbox.
