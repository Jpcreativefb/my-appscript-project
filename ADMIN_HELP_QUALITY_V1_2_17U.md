# v1.2.17u — Admin Help Quality Cleanup

Purpose: clean up the shared Admin help system before continuing Appearance Studio work.

- Stops automatic help from creating duplicate visible field titles.
- Reuses existing label/title spans instead of inserting a second title.
- Repairs legacy auto-enhanced duplicate labels when a page is enhanced more than once.
- Removes the generic "Controls X" fallback. Unknown fields no longer receive meaningless help icons.
- Adds specific help descriptions for common Manage Games, Awards, Sports, Reality TV, and Appearance Studio controls.
- Adds specific descriptions for Appearance Studio section headings so section help explains what that group actually changes.
- Bumps the frontend asset/cache marker so every Admin route receives the shared fix.
