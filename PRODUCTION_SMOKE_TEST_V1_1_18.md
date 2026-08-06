# Production Smoke Test — Reality TV Bulk Extra Questions v1.1.18

1. Deploy backend and frontend, then hard-refresh the app.
2. Use **Reset Stuck Approval** on any old v1.1.16 approval that still shows an unchanged checkpoint, then select **Resume Approval** once.
3. Approve one main elimination for only one show first.
4. Confirm the progress path reaches **Preparing Next Episode**, **Creating Main Question**, **Adding Main Answers**, and **Saving Next Episode**.
5. Confirm Extra Questions show **Preparing Extra Questions**, **Writing Extra Questions in bulk**, and **Verifying Extra Questions**.
6. Confirm the counter completes in one pass and does not remain at `0 of N`.
7. Open the next episode and verify the main question plus every enabled Extra Question and answer list.
8. Resume or rerun repair once and confirm no duplicate question or answer rows are created.
9. Start a second show's approval while the first runs and confirm it displays **Waiting for another approval** rather than competing.
10. Confirm the displayed percentage never moves backward.
11. Confirm local approval reaches Ready even when External Results Hub is not configured.
