# v1.2.17p — Image Mode Separation + Mirror Layout

This checkpoint separates the Appearance Studio team-image renderer into four explicit modes: Inline Logo/Image, Inline + Background Art, Floating Art, and Full Button Background. It adds mirrored Home/Away layout behavior and changes the desktop Studio to an independently scrolling control rail beside a continuously visible preview canvas.

## Key behavior
- Full Button Background ignores floating-art size and owns the full button surface.
- Inline mode restores a classic structured logo + stacked city/team + inline score layout.
- Inline + Background Art keeps structured text/score while allowing art to move behind them.
- Floating Art remains a free-positioned object.
- Mirror Home/Away derives Home alignment, score anchor, X offsets, and image X from Away.
- Desktop controls scroll independently; preview remains visible.
