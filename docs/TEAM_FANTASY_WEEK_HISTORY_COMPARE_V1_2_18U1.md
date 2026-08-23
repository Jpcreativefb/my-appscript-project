# Team Fantasy v1.2.18u1

This release builds on v1.2.18t2 and keeps the existing scorer, privacy rules, 5-minute cached game-day architecture, AP/R tags, and six-team Test Lab.

## Player UI
- Selection surfaces use a dark navy background with white text/borders.
- Team picker backgrounds communicate remaining season uses for that fantasy position: 3+ left dark navy, 2 left medium blue, 1 left lighter blue.
- Teams with 0 uses remaining for that position are omitted from the picker.
- BYE/not-scheduled teams remain visible for context but are ghosted and disabled for that week.
- Weekly League rows are dark with white borders; the viewer is identified only by a blue border.
- Compare orders the viewer first, freezes that column on horizontal scroll, and keeps team headers sticky.
- League View and Compare can select current or past weeks. Historical weeks do not start live polling.
- Week History is restored as the final player-page section.
