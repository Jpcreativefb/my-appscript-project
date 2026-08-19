/*
 * Shared Appearance Theme Runtime — v1.2.17v
 * Canonical theme -> CSS/class serialization used by both Appearance Studio preview
 * and the real Picks/Confidence runtime. Keeping this path shared prevents the
 * Studio and live game from drifting apart again.
 */
(function(global){
  "use strict";

  function confidenceThemeToken_(value, allowed, fallback) {
    const key = String(value || "").trim().toLowerCase();
    return allowed.indexOf(key) !== -1 ? key : fallback;
  }

  function confidenceThemeSafeColor_(value, fallback) {
    const text = String(value || "").trim();
    return /^#[0-9a-f]{6}$/i.test(text) ? text : fallback;
  }

  function confidenceThemeNumber_(value, min, max, fallback) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.max(min, Math.min(max, number));
  }

  function confidenceThemeHexRgba_(value, opacityPercent, fallback) {
    const color = confidenceThemeSafeColor_(value, fallback || "#2563eb");
    const match = /^#([0-9a-f]{6})$/i.exec(color);
    if (!match) return "rgba(37,99,235," + (Number(opacityPercent || 0) / 100) + ")";
    const parsed = parseInt(match[1], 16);
    return "rgba(" + ((parsed >> 16) & 255) + "," + ((parsed >> 8) & 255) + "," + (parsed & 255) + "," + (Number(opacityPercent || 0) / 100) + ")";
  }

  function confidencePresentation(theme) {
    theme = theme || {};
    const team = theme.team || {};
    const row = theme.row || {};
    const colors = theme.colors || {};
    const layout = theme.layout || {};
    const typography = theme.typography || {};
    const images = theme.images || {};
    const selection = theme.selection || {};
    const result = theme.result || {};
    const live = theme.live || {};
    const background = theme.background || {};
    const confidence = theme.confidence || {};
    const score = theme.score || {};
    const scoreboard = theme.scoreboard || {};
    const positioning = theme.positioning || {};
    const overlays = theme.overlays || {};
    const textBackdrop = theme.textBackdrop || {};
    const winner = theme.winner || {};
    const visibility = theme.visibility || {};
    const visElements = visibility.elements || {};
    const visDevices = visibility.devices || {};
    const resultTypography = theme.resultTypography || {};
    const correctType = resultTypography.correct || {};
    const wrongType = resultTypography.incorrect || {};
    const sideLayout = theme.sideLayout || {};
    const awayLayout = Object.assign({}, sideLayout.away || {});
    let homeLayout = Object.assign({}, sideLayout.home || {});
    if (sideLayout.mirrored === true) {
      const mirrorAlign = function(value) { return value === "left" ? "right" : value === "right" ? "left" : (value || "center"); };
      const mirrorScore = function(value) {
        const map = {"inline-left":"inline-right","inline-right":"inline-left","top-left":"top-right","top-right":"top-left","bottom-left":"bottom-right","bottom-right":"bottom-left"};
        return map[value] || value || "inline-left";
      };
      homeLayout = {
        textAlign: mirrorAlign(awayLayout.textAlign || positioning.nameAlign || "left"),
        textVertical: awayLayout.textVertical || positioning.textVertical || "center",
        textOffsetX: -Number(awayLayout.textOffsetX || 0),
        textOffsetY: Number(awayLayout.textOffsetY || 0),
        scoreAnchor: mirrorScore(awayLayout.scoreAnchor || positioning.scoreAnchor || "inline-right"),
        scoreOffsetX: -Number(awayLayout.scoreOffsetX || 0),
        scoreOffsetY: Number(awayLayout.scoreOffsetY || 0),
        imageX: 100 - Number(awayLayout.imageX == null ? (images.x == null ? 50 : images.x) : awayLayout.imageX),
        imageY: Number(awayLayout.imageY == null ? (images.y == null ? 50 : images.y) : awayLayout.imageY)
      };
    }
  
    const unselected = confidenceThemeToken_(selection.unselectedTreatment || team.unselectedTreatment, ["grayscale", "dim", "none"], "grayscale");
    const imageFit = confidenceThemeToken_(images.fit, ["contain", "cover", "full-bleed"], "contain");
    const imageLayer = imageFit === "full-bleed"
      ? "background"
      : confidenceThemeToken_(images.layer, ["inline", "inline-background", "floating", "background"], "inline");
    const teamOrder = confidenceThemeToken_(layout.teamOrder, ["away-home", "home-away"], "away-home");
    const classes = [
      "confidence-theme-density-" + confidenceThemeToken_(theme.density, ["compact", "standard", "comfortable"], "compact"),
      "confidence-theme-city-" + confidenceThemeToken_(team.cityScale, ["small", "medium"], "small"),
      "confidence-theme-name-" + confidenceThemeToken_(team.nameScale, ["medium", "large", "xlarge"], "large"),
      "confidence-theme-unselected-" + unselected,
      "confidence-theme-corners-" + confidenceThemeToken_(row.corners, ["square", "soft", "rounded", "custom"], "soft"),
      "confidence-theme-spacing-" + confidenceThemeToken_(row.spacing, ["tight", "normal"], "tight"),
      "confidence-theme-shadow-" + confidenceThemeToken_(row.shadow, ["none", "soft", "strong"], "soft"),
      "confidence-theme-image-shape-" + confidenceThemeToken_(images.shape, ["square", "soft", "round"], "square"),
      "confidence-theme-image-align-" + confidenceThemeToken_(images.verticalAlign, ["top", "center", "bottom"], "center"),
      "confidence-theme-image-fit-" + imageFit,
      "confidence-theme-image-layer-" + imageLayer,
      "confidence-theme-team-order-" + teamOrder,
      sideLayout.separate === true || sideLayout.mirrored === true ? "confidence-theme-side-layout-separate" : "confidence-theme-side-layout-shared",
      sideLayout.mirrored === true ? "confidence-theme-side-layout-mirrored" : "confidence-theme-side-layout-independent",
      "confidence-theme-away-align-" + confidenceThemeToken_(awayLayout.textAlign, ["left", "center", "right"], positioning.nameAlign || "left"),
      "confidence-theme-home-align-" + confidenceThemeToken_(homeLayout.textAlign, ["left", "center", "right"], positioning.nameAlign || "left"),
      "confidence-theme-away-vertical-" + confidenceThemeToken_(awayLayout.textVertical, ["top", "center", "bottom"], positioning.textVertical || "center"),
      "confidence-theme-home-vertical-" + confidenceThemeToken_(homeLayout.textVertical, ["top", "center", "bottom"], positioning.textVertical || "center"),
      "confidence-theme-away-score-anchor-" + confidenceThemeToken_(awayLayout.scoreAnchor, ["top-left", "top-right", "bottom-left", "bottom-right", "inline-left", "inline-right", "center"], positioning.scoreAnchor || "bottom-left"),
      "confidence-theme-home-score-anchor-" + confidenceThemeToken_(homeLayout.scoreAnchor, ["top-left", "top-right", "bottom-left", "bottom-right", "inline-left", "inline-right", "center"], positioning.scoreAnchor || "bottom-left"),
      "confidence-theme-city-align-" + confidenceThemeToken_(positioning.cityAlign, ["left", "center", "right"], "left"),
      "confidence-theme-name-align-" + confidenceThemeToken_(positioning.nameAlign, ["left", "center", "right"], "left"),
      "confidence-theme-text-vertical-" + confidenceThemeToken_(positioning.textVertical, ["top", "center", "bottom"], "center"),
      "confidence-theme-score-anchor-" + confidenceThemeToken_(positioning.scoreAnchor, ["top-left", "top-right", "bottom-left", "bottom-right", "inline-left", "inline-right", "center"], "bottom-left"),
      "confidence-theme-confidence-vertical-" + confidenceThemeToken_(positioning.confidenceVertical, ["top", "center", "bottom"], "center"),
      "confidence-theme-status-align-" + confidenceThemeToken_(positioning.statusAlign, ["left", "center", "right"], "left"),
      "confidence-theme-background-" + confidenceThemeToken_(background.mode, ["solid", "gradient"], "gradient"),
      "confidence-theme-confidence-" + confidenceThemeToken_(confidence.style, ["filled", "outline", "minimal"], "filled"),
      "confidence-theme-live-badge-" + confidenceThemeToken_(live.badgeStyle, ["text", "outline", "pill"], "text"),
      "confidence-theme-final-badge-" + confidenceThemeToken_(live.finalBadgeStyle, ["text", "outline", "pill"], "text"),
      textBackdrop.enabled === true ? "confidence-theme-text-backdrop" : "",
      "confidence-theme-text-backdrop-" + confidenceThemeToken_(textBackdrop.mode, ["solid", "gradient"], "gradient"),
      "confidence-theme-winner-overlay-" + confidenceThemeToken_(winner.overlayType, ["none", "solid", "gradient"], "none"),
      "confidence-theme-winner-placement-" + confidenceThemeToken_(winner.placement, ["full", "top", "bottom"], "full"),
      "confidence-theme-winner-decoration-" + confidenceThemeToken_(winner.decoration, ["none", "trophy", "crown", "medal", "star", "check"], "none"),
      "confidence-theme-winner-decoration-position-" + confidenceThemeToken_(winner.decorationPosition, ["top-left", "top-right", "bottom-left", "bottom-right", "center"], "top-right"),
      typography.uppercase === false ? "confidence-theme-team-naturalcase" : "confidence-theme-team-uppercase"
    ];
  
    const visibilityKeys = ["city","teamName","teamImage","score","versus","gameTime","liveBadge","clock","finalBadge","confidenceLabel","confidenceValue","points","resultIndicator","detailsBar","records","favorite","moneyline","spread","overUnder"];
    visibilityKeys.forEach(function(key) {
      if (visElements[key] === false) classes.push("confidence-hide-" + key);
      ["desktop", "tablet", "mobile"].forEach(function(device) {
        const deviceMap = visDevices[device] || {};
        if (deviceMap[key] === false) classes.push("confidence-hide-" + key + "-" + device);
      });
    });
  
    if (images.oversize === true) classes.push("confidence-theme-image-oversize");
    if (Object.keys(colors).length || Number(theme.studioVersion) >= 1) classes.push("confidence-theme-custom-colors");
  
    const rowHeight = confidenceThemeNumber_(layout.rowHeight, 60, 160, 76);
    const rowPadding = confidenceThemeNumber_(layout.rowPadding, 0, 24, 7);
    const teamGap = confidenceThemeNumber_(layout.teamGap, 0, 28, 7);
    const versusWidth = confidenceThemeNumber_(layout.versusWidth, 0, 52, 32);
    const confidenceWidth = confidenceThemeNumber_(layout.confidenceWidth, 44, 160, 92);
    const citySize = confidenceThemeNumber_(typography.citySize, 7, 24, 10);
    const cityWeight = confidenceThemeNumber_(typography.cityWeight, 300, 1000, 700);
    const cityOpacity = confidenceThemeNumber_(typography.cityOpacity, 0, 100, 62);
    const nameSize = confidenceThemeNumber_(typography.teamNameSize, 10, 36, 16);
    const nameWeight = confidenceThemeNumber_(typography.teamNameWeight, 300, 1000, 950);
    const nameSpacing = confidenceThemeNumber_(typography.teamNameSpacing, -3, 14, 2.5);
    const scoreSize = confidenceThemeNumber_(typography.scoreSize, 9, 34, 12);
    const confidenceSize = confidenceThemeNumber_(typography.confidenceSize, 11, 38, 16);
    const imageSize = confidenceThemeNumber_(images.size, 20, 140, 38);
    const imageOpacity = confidenceThemeNumber_(images.opacity, 0, 100, 100);
    const imageZoom = confidenceThemeNumber_(images.zoom, 50, 220, 100);
    const imageX = confidenceThemeNumber_(images.x, 0, 100, 50);
    const imageY = confidenceThemeNumber_(images.y, 0, 100, 50);
    const awayImageXRaw = confidenceThemeNumber_(awayLayout.imageX, 0, 100, 50);
    const awayImageYRaw = confidenceThemeNumber_(awayLayout.imageY, 0, 100, 50);
    const homeImageXRaw = confidenceThemeNumber_(homeLayout.imageX, 0, 100, 50);
    const homeImageYRaw = confidenceThemeNumber_(homeLayout.imageY, 0, 100, 50);
    // Global Image X/Y is the base position for both teams. Side controls are
    // relative adjustments around 50, so the main sliders always have a visible effect.
    const awayImageX = confidenceThemeNumber_(imageX + (awayImageXRaw - 50), 0, 100, imageX);
    const awayImageY = confidenceThemeNumber_(imageY + (awayImageYRaw - 50), 0, 100, imageY);
    const homeImageX = confidenceThemeNumber_(imageX + (homeImageXRaw - 50), 0, 100, imageX);
    const homeImageY = confidenceThemeNumber_(imageY + (homeImageYRaw - 50), 0, 100, imageY);
    const awayTextOffsetX = confidenceThemeNumber_(awayLayout.textOffsetX, -40, 40, positioning.textOffsetX || 0);
    const awayTextOffsetY = confidenceThemeNumber_(awayLayout.textOffsetY, -40, 40, positioning.textOffsetY || 0);
    const homeTextOffsetX = confidenceThemeNumber_(homeLayout.textOffsetX, -40, 40, positioning.textOffsetX || 0);
    const homeTextOffsetY = confidenceThemeNumber_(homeLayout.textOffsetY, -40, 40, positioning.textOffsetY || 0);
    const textOffsetX = confidenceThemeNumber_(positioning.textOffsetX, -30, 30, 0);
    const textOffsetY = confidenceThemeNumber_(positioning.textOffsetY, -30, 30, 0);
    const scoreOffsetX = confidenceThemeNumber_(positioning.scoreOffsetX, -50, 50, 0);
    const scoreOffsetY = confidenceThemeNumber_(positioning.scoreOffsetY, -50, 50, 0);
    const awayScoreOffsetX = confidenceThemeNumber_(awayLayout.scoreOffsetX, -50, 50, scoreOffsetX);
    const awayScoreOffsetY = confidenceThemeNumber_(awayLayout.scoreOffsetY, -50, 50, scoreOffsetY);
    const homeScoreOffsetX = confidenceThemeNumber_(homeLayout.scoreOffsetX, -50, 50, scoreOffsetX);
    const homeScoreOffsetY = confidenceThemeNumber_(homeLayout.scoreOffsetY, -50, 50, scoreOffsetY);
    const selectedBorderWidth = confidenceThemeNumber_(selection.selectedBorderWidth, 0, 10, 2);
    const selectedTintOpacity = confidenceThemeNumber_(selection.selectedTintOpacity, 0, 80, 20);
    const unselectedGray = confidenceThemeNumber_(selection.unselectedGrayscale, 0, 100, 100);
    const unselectedOpacity = confidenceThemeNumber_(selection.unselectedOpacity, 0, 100, 48);
    const resultWidth = confidenceThemeNumber_(result.borderWidth, 0, 10, 2);
    const radius = confidenceThemeNumber_(row.radius, 0, 32, row.corners === "rounded" ? 18 : row.corners === "square" ? 0 : 10);
    const gradientAngle = confidenceThemeNumber_(background.gradientAngle, 0, 360, 180);
    const overlayOpacity = confidenceThemeNumber_(background.overlayOpacity, 0, 80, 0);
    const confidenceRadius = confidenceThemeNumber_(confidence.radius, 0, 28, 8);
    const lockedOpacity = confidenceThemeNumber_(confidence.lockedOpacity, 20, 100, 62);
    const scoreBgOpacity = confidenceThemeNumber_(score.backgroundOpacity, 0, 100, 100);
    const scoreBorderOpacity = confidenceThemeNumber_(score.borderOpacity, 0, 100, 100);
    const scoreRadius = confidenceThemeNumber_(score.radius, 0, 24, 7);
    const scorePaddingX = confidenceThemeNumber_(score.paddingX, 0, 20, 4);
    const scorePaddingY = confidenceThemeNumber_(score.paddingY, 0, 14, 2);
    const scoreboardOpacity = confidenceThemeNumber_(scoreboard.backgroundOpacity, 0, 100, 72);
    const scoreboardBorderOpacity = confidenceThemeNumber_(scoreboard.borderOpacity, 0, 100, 32);
    const scoreboardHeight = confidenceThemeNumber_(scoreboard.height, 18, 64, 26);
    const scoreboardRadius = confidenceThemeNumber_(scoreboard.radius, 0, 20, 0);
    const scoreboardFontSize = confidenceThemeNumber_(scoreboard.fontSize, 7, 20, 10);
  
    const vars = [
      "--confidence-theme-accent:" + confidenceThemeSafeColor_(colors.accent || selection.selectedBorderColor, "#60a5fa"),
      "--confidence-theme-surface:" + confidenceThemeSafeColor_(background.solid || colors.surface, "#0f172a"),
      "--confidence-theme-text:" + confidenceThemeSafeColor_(colors.text, "#ffffff"),
      "--confidence-theme-muted:" + confidenceThemeSafeColor_(colors.muted, "#94a3b8"),
      "--confidence-theme-correct:" + confidenceThemeSafeColor_(colors.correct, "#22c55e"),
      "--confidence-theme-incorrect:" + confidenceThemeSafeColor_(colors.incorrect, "#ef4444"),
      "--confidence-theme-live:" + confidenceThemeSafeColor_(colors.live, "#ef4444"),
      "--confidence-theme-final:" + confidenceThemeSafeColor_(colors.final, "#e2e8f0"),
      "--confidence-row-height:" + rowHeight + "px",
      "--confidence-row-padding:" + rowPadding + "px",
      "--confidence-team-gap:" + teamGap + "px",
      "--confidence-versus-width:" + versusWidth + "px",
      "--confidence-value-width:" + confidenceWidth + "px",
      "--confidence-row-radius:" + radius + "px",
      "--confidence-city-size:" + citySize + "px",
      "--confidence-city-weight:" + cityWeight,
      "--confidence-city-opacity:" + (cityOpacity / 100),
      "--confidence-name-size:" + nameSize + "px",
      "--confidence-name-weight:" + nameWeight,
      "--confidence-name-spacing:" + nameSpacing + "px",
      "--confidence-score-size:" + scoreSize + "px",
      "--confidence-value-size:" + confidenceSize + "px",
      "--confidence-image-size:" + imageSize + "px",
      "--confidence-image-opacity:" + (imageOpacity / 100),
      "--confidence-image-zoom:" + (imageZoom / 100),
      "--confidence-image-x:" + imageX + "%",
      "--confidence-image-y:" + imageY + "%",
      "--confidence-away-image-x:" + awayImageX + "%",
      "--confidence-away-image-y:" + awayImageY + "%",
      "--confidence-home-image-x:" + homeImageX + "%",
      "--confidence-home-image-y:" + homeImageY + "%",
      "--confidence-away-text-x:" + awayTextOffsetX + "px",
      "--confidence-away-text-y:" + awayTextOffsetY + "px",
      "--confidence-home-text-x:" + homeTextOffsetX + "px",
      "--confidence-home-text-y:" + homeTextOffsetY + "px",
      "--confidence-text-offset-x:" + textOffsetX + "px",
      "--confidence-text-offset-y:" + textOffsetY + "px",
      "--confidence-score-offset-x:" + scoreOffsetX + "px",
      "--confidence-score-offset-y:" + scoreOffsetY + "px",
      "--confidence-away-score-x:" + awayScoreOffsetX + "px",
      "--confidence-away-score-y:" + awayScoreOffsetY + "px",
      "--confidence-home-score-x:" + homeScoreOffsetX + "px",
      "--confidence-home-score-y:" + homeScoreOffsetY + "px",
      "--confidence-selected-border:" + confidenceThemeSafeColor_(selection.selectedBorderColor || colors.accent, "#60a5fa"),
      "--confidence-selected-width:" + selectedBorderWidth + "px",
      "--confidence-selected-bg:" + confidenceThemeHexRgba_(selection.selectedTint || colors.accent, selectedTintOpacity, "#2563eb"),
      "--confidence-unselected-gray:" + (unselectedGray / 100),
      "--confidence-unselected-opacity:" + (unselectedOpacity / 100),
      "--confidence-result-width:" + resultWidth + "px",
      "--confidence-gradient:" + "linear-gradient(" + gradientAngle + "deg," + confidenceThemeSafeColor_(background.gradientStart, "#1e293b") + "," + confidenceThemeSafeColor_(background.gradientEnd, "#0f172a") + ")",
      "--confidence-overlay-opacity:" + (overlayOpacity / 100),
      "--confidence-selected-overlay:" + confidenceThemeHexRgba_(overlays.selectedColor || selection.selectedTint, confidenceThemeNumber_(overlays.selectedOpacity,0,80,20), "#2563eb"),
      "--confidence-unselected-overlay:" + confidenceThemeHexRgba_(overlays.unselectedColor, confidenceThemeNumber_(overlays.unselectedOpacity,0,80,12), "#020617"),
      "--confidence-correct-overlay:" + (confidenceThemeToken_(overlays.correctMode,["solid","gradient"],"solid") === "gradient" ? "linear-gradient(" + confidenceThemeNumber_(overlays.correctAngle,0,360,135) + "deg," + confidenceThemeHexRgba_(overlays.correctColor || colors.correct, confidenceThemeNumber_(overlays.correctOpacity,0,100,12), "#22c55e") + "," + confidenceThemeHexRgba_(overlays.correctColor2 || "#14532d", confidenceThemeNumber_(overlays.correctOpacity2,0,100,overlays.correctOpacity == null ? 12 : overlays.correctOpacity), "#14532d") + ")" : confidenceThemeHexRgba_(overlays.correctColor || colors.correct, confidenceThemeNumber_(overlays.correctOpacity,0,100,12), "#22c55e")),
      "--confidence-incorrect-overlay:" + (confidenceThemeToken_(overlays.incorrectMode,["solid","gradient"],"solid") === "gradient" ? "linear-gradient(" + confidenceThemeNumber_(overlays.incorrectAngle,0,360,135) + "deg," + confidenceThemeHexRgba_(overlays.incorrectColor || colors.incorrect, confidenceThemeNumber_(overlays.incorrectOpacity,0,100,12), "#ef4444") + "," + confidenceThemeHexRgba_(overlays.incorrectColor2 || "#7f1d1d", confidenceThemeNumber_(overlays.incorrectOpacity2,0,100,overlays.incorrectOpacity == null ? 12 : overlays.incorrectOpacity), "#7f1d1d") + ")" : confidenceThemeHexRgba_(overlays.incorrectColor || colors.incorrect, confidenceThemeNumber_(overlays.incorrectOpacity,0,100,12), "#ef4444")),
      "--confidence-live-overlay:" + confidenceThemeHexRgba_(overlays.liveColor || colors.live, confidenceThemeNumber_(overlays.liveOpacity,0,60,0), "#ef4444"),
      "--confidence-final-overlay:" + confidenceThemeHexRgba_(overlays.finalColor || colors.final, confidenceThemeNumber_(overlays.finalOpacity,0,60,0), "#e2e8f0"),
      "--confidence-value-bg:" + confidenceThemeSafeColor_(confidence.background, "#0b1220"),
      "--confidence-value-text:" + confidenceThemeSafeColor_(confidence.text || colors.text, "#ffffff"),
      "--confidence-value-border:" + confidenceThemeSafeColor_(confidence.border || colors.accent, "#60a5fa"),
      "--confidence-value-radius:" + confidenceRadius + "px",
      "--confidence-locked-opacity:" + (lockedOpacity / 100),
      "--confidence-mobile-arrow-size:" + confidenceThemeNumber_(confidence.mobileArrowSize, 0, 10, 4) + "px",
      "--confidence-mobile-arrow-color:" + confidenceThemeSafeColor_(confidence.mobileArrowColor || colors.muted, "#94a3b8"),
      "--confidence-score-bg:" + confidenceThemeHexRgba_(score.background || "#e2e8f0", scoreBgOpacity, "#e2e8f0"),
      "--confidence-score-text:" + confidenceThemeSafeColor_(score.text || "#0f172a", "#0f172a"),
      "--confidence-score-border:" + confidenceThemeHexRgba_(score.border || "#0f172a", scoreBorderOpacity, "#0f172a"),
      "--confidence-score-radius:" + scoreRadius + "px",
      "--confidence-score-padding-x:" + scorePaddingX + "px",
      "--confidence-score-padding-y:" + scorePaddingY + "px",
      "--confidence-scoreboard-bg:" + confidenceThemeHexRgba_(scoreboard.background || "#0b1220", scoreboardOpacity, "#0b1220"),
      "--confidence-scoreboard-text:" + confidenceThemeSafeColor_(scoreboard.text || colors.muted, "#94a3b8"),
      "--confidence-scoreboard-border:" + confidenceThemeHexRgba_(scoreboard.border || "#334155", scoreboardBorderOpacity, "#334155"),
      "--confidence-scoreboard-height:" + scoreboardHeight + "px",
      "--confidence-scoreboard-radius:" + scoreboardRadius + "px",
      "--confidence-scoreboard-font-size:" + scoreboardFontSize + "px",
      "--confidence-text-backdrop-solid:" + confidenceThemeHexRgba_(textBackdrop.color || "#000000", confidenceThemeNumber_(textBackdrop.opacity,0,100,45), "#000000"),
      "--confidence-text-backdrop-gradient:linear-gradient(" + confidenceThemeNumber_(textBackdrop.angle,0,360,90) + "deg," + confidenceThemeHexRgba_(textBackdrop.color || "#000000", confidenceThemeNumber_(textBackdrop.opacity,0,100,45), "#000000") + "," + confidenceThemeHexRgba_(textBackdrop.color2 || "#000000", confidenceThemeNumber_(textBackdrop.opacity,0,100,45), "#000000") + ")",
      "--confidence-text-backdrop-padding:" + confidenceThemeNumber_(textBackdrop.padding,0,24,6) + "px",
      "--confidence-text-backdrop-radius:" + confidenceThemeNumber_(textBackdrop.radius,0,24,6) + "px",
      "--confidence-winner-solid:" + confidenceThemeHexRgba_(winner.color || colors.correct || "#22c55e", confidenceThemeNumber_(winner.opacity,0,100,20), "#22c55e"),
      "--confidence-winner-gradient:linear-gradient(" + confidenceThemeNumber_(winner.angle,0,360,135) + "deg," + confidenceThemeHexRgba_(winner.color || "#22c55e", confidenceThemeNumber_(winner.opacity,0,100,20), "#22c55e") + "," + confidenceThemeHexRgba_(winner.color2 || "#14532d", confidenceThemeNumber_(winner.opacity,0,100,20), "#14532d") + ")",
      "--confidence-winner-decoration-size:" + confidenceThemeNumber_(winner.decorationSize,12,64,28) + "px",
      "--confidence-winner-decoration-color:" + confidenceThemeSafeColor_(winner.decorationColor || "#facc15", "#facc15"),
      "--confidence-correct-city:" + confidenceThemeSafeColor_(correctType.city || colors.text, "#ffffff"),
      "--confidence-correct-name:" + confidenceThemeSafeColor_(correctType.teamName || colors.text, "#ffffff"),
      "--confidence-correct-score:" + confidenceThemeSafeColor_(correctType.score || colors.correct, "#22c55e"),
      "--confidence-correct-status:" + confidenceThemeSafeColor_(correctType.status || colors.correct, "#22c55e"),
      "--confidence-correct-value:" + confidenceThemeSafeColor_(correctType.confidenceNumber || colors.correct, "#22c55e"),
      "--confidence-correct-label:" + confidenceThemeSafeColor_(correctType.confidenceLabel || colors.muted, "#94a3b8"),
      "--confidence-correct-points:" + confidenceThemeSafeColor_(correctType.points || colors.correct, "#22c55e"),
      "--confidence-wrong-city:" + confidenceThemeSafeColor_(wrongType.city || colors.text, "#ffffff"),
      "--confidence-wrong-name:" + confidenceThemeSafeColor_(wrongType.teamName || colors.text, "#ffffff"),
      "--confidence-wrong-score:" + confidenceThemeSafeColor_(wrongType.score || colors.incorrect, "#ef4444"),
      "--confidence-wrong-status:" + confidenceThemeSafeColor_(wrongType.status || colors.incorrect, "#ef4444"),
      "--confidence-wrong-value:" + confidenceThemeSafeColor_(wrongType.confidenceNumber || colors.incorrect, "#ef4444"),
      "--confidence-wrong-label:" + confidenceThemeSafeColor_(wrongType.confidenceLabel || colors.muted, "#94a3b8"),
      "--confidence-wrong-points:" + confidenceThemeSafeColor_(wrongType.points || colors.incorrect, "#ef4444")
    ];
  
    return { className: classes.join(" "), style: vars.join(";") };
  }

  function picksAppearanceHexRgba_(hex, opacity, fallback) {
    const value = /^#[0-9a-f]{6}$/i.test(String(hex||"")) ? String(hex) : (fallback || "#0f172a");
    const parsed = parseInt(value.slice(1),16);
    return "rgba("+((parsed>>16)&255)+","+((parsed>>8)&255)+","+(parsed&255)+","+(Number(opacity==null?100:opacity)/100)+")";
  }

  function pagePresentation(theme) {
    theme = theme || {};
    const page = theme.page || {}, q = theme.questions || {}, details = theme.details || {}, bars = theme.bars || {}, winner = theme.winner || {};
    const pageMode = confidenceThemeToken_(page.backgroundMode,["solid","gradient"],"solid");
    const headerMode = confidenceThemeToken_(page.headerMode,["solid","gradient"],"solid");
    const cardMode = confidenceThemeToken_(q.cardMode,["solid","gradient"],"solid");
    const qHeaderMode = confidenceThemeToken_(q.headerMode,["solid","gradient"],"solid");
    const answerMode = confidenceThemeToken_(q.answerMode,["solid","gradient"],"solid");
    const selectedMode = confidenceThemeToken_(q.selectedMode,["solid","gradient"],"solid");
    const sortMode = confidenceThemeToken_(bars.sortMode,["solid","gradient"],"solid");
    const saveMode = confidenceThemeToken_(bars.saveMode,["solid","gradient"],"solid");
    const winnerType = confidenceThemeToken_(winner.overlayType,["none","solid","gradient"],"none");
    const winnerPlacement = confidenceThemeToken_(winner.placement,["full","top","bottom"],"full");
    const winnerDecoration = confidenceThemeToken_(winner.decoration,["none","trophy","crown","medal","star","check"],"none");
    const winnerDecorationPosition = confidenceThemeToken_(winner.decorationPosition,["top-left","top-right","bottom-left","bottom-right","center"],"top-right");
    const headerOpacity = confidenceThemeNumber_(page.headerOpacity,0,100,100);
    const style = [
      "--picks-theme-page-bg:"+(page.background||"#020617"),
      "--picks-theme-page-gradient:linear-gradient("+confidenceThemeNumber_(page.gradientAngle,0,360,180)+"deg,"+confidenceThemeSafeColor_(page.gradientStart||page.background,"#020617")+","+confidenceThemeSafeColor_(page.gradientEnd,"#0f172a")+")",
      "--picks-theme-header-bg:"+picksAppearanceHexRgba_(page.headerBackground,headerOpacity,"#0f172a"),
      "--picks-theme-header-gradient:linear-gradient("+confidenceThemeNumber_(page.headerGradientAngle,0,360,135)+"deg,"+picksAppearanceHexRgba_(page.headerGradientStart||page.headerBackground,headerOpacity,"#0f172a")+","+picksAppearanceHexRgba_(page.headerGradientEnd,headerOpacity,"#1e293b")+")",
      "--picks-theme-header-text:"+(page.headerText||"#ffffff"),
      "--picks-theme-header-muted:"+(page.headerMuted||"#94a3b8"),
      "--picks-theme-header-radius:"+(Number(page.headerRadius)||16)+"px",
      "--picks-theme-section-gap:"+(Number(page.sectionGap)||18)+"px",
      "--picks-theme-question-bg:"+picksAppearanceHexRgba_(q.cardBackground,q.cardOpacity,"#0f172a"),
      "--picks-theme-question-gradient:linear-gradient("+confidenceThemeNumber_(q.cardGradientAngle,0,360,180)+"deg,"+picksAppearanceHexRgba_(q.cardGradientStart||q.cardBackground,q.cardOpacity,"#0f172a")+","+picksAppearanceHexRgba_(q.cardGradientEnd,q.cardOpacity,"#1e293b")+")",
      "--picks-theme-question-header-bg:"+picksAppearanceHexRgba_(q.headerBackground,q.headerOpacity,"#111111"),
      "--picks-theme-question-header-gradient:linear-gradient("+confidenceThemeNumber_(q.headerGradientAngle,0,360,90)+"deg,"+picksAppearanceHexRgba_(q.headerGradientStart||q.headerBackground,q.headerOpacity,"#111111")+","+picksAppearanceHexRgba_(q.headerGradientEnd,q.headerOpacity,"#1e293b")+")",
      "--picks-theme-question-title:"+(q.titleColor||"#ffffff"),
      "--picks-theme-question-title-size:"+(Number(q.titleSize)||16)+"px",
      "--picks-theme-answer-bg:"+(q.answerBackground||"#1e293b"),
      "--picks-theme-answer-gradient:linear-gradient("+confidenceThemeNumber_(q.answerGradientAngle,0,360,180)+"deg,"+confidenceThemeSafeColor_(q.answerGradientStart||q.answerBackground,"#1e293b")+","+confidenceThemeSafeColor_(q.answerGradientEnd,"#0f172a")+")",
      "--picks-theme-answer-text:"+(q.answerText||"#ffffff"),
      "--picks-theme-answer-border:"+(q.answerBorder||"#334155"),
      "--picks-theme-selected-bg:"+(q.selectedBackground||"#854d0e"),
      "--picks-theme-selected-gradient:linear-gradient("+confidenceThemeNumber_(q.selectedGradientAngle,0,360,135)+"deg,"+confidenceThemeSafeColor_(q.selectedGradientStart||q.selectedBackground,"#854d0e")+","+confidenceThemeSafeColor_(q.selectedGradientEnd,"#f59e0b")+")",
      "--picks-theme-selected-text:"+(q.selectedText||"#fde68a"),
      "--picks-theme-selected-border:"+(q.selectedBorder||"#facc15"),
      "--picks-theme-question-radius:"+(Number(q.radius)||16)+"px",
      "--picks-theme-question-gap:"+(Number(q.gap)||12)+"px",
      "--picks-theme-text-columns:"+(Number(q.textColumns)||2),
      "--picks-theme-compact-columns:"+(Number(q.compactColumns)||1),
      "--picks-theme-compact-image:"+(Number(q.compactImageSize)||44)+"px",
      "--picks-theme-image-columns:"+(Number(q.imageColumns)||4),
      "--picks-theme-image-aspect:"+String(q.imageAspect||"2/3").replace("/"," / "),
      "--picks-theme-image-fit:"+(q.imageFit||"cover"),
      "--picks-theme-image-zoom:"+(confidenceThemeNumber_(q.imageZoom,50,220,100)/100),
      "--picks-theme-image-x:"+confidenceThemeNumber_(q.imageX,0,100,50)+"%",
      "--picks-theme-image-y:"+confidenceThemeNumber_(q.imageY,0,100,50)+"%",
      "--picks-theme-image-opacity:"+(confidenceThemeNumber_(q.imageOpacity,0,100,100)/100),
      "--picks-theme-image-overlay:"+(Number(q.imageOverlayOpacity == null ? 35 : q.imageOverlayOpacity)/100),
      "--picks-theme-image-overlay2:"+(Number(q.imageOverlayOpacity2 == null ? q.imageOverlayOpacity == null ? 0 : q.imageOverlayOpacity : q.imageOverlayOpacity2)/100),
      "--picks-theme-image-overlay-color:"+confidenceThemeSafeColor_(q.imageOverlayColor,"#000000"),
      "--picks-theme-image-overlay-color2:"+confidenceThemeSafeColor_(q.imageOverlayColor2,"#000000"),
      "--picks-theme-image-overlay-solid:"+picksAppearanceHexRgba_(q.imageOverlayColor,q.imageOverlayOpacity,"#000000"),
      "--picks-theme-image-overlay-gradient:linear-gradient("+confidenceThemeNumber_(q.imageOverlayAngle,0,360,0)+"deg,"+picksAppearanceHexRgba_(q.imageOverlayColor,q.imageOverlayOpacity,"#000000")+","+picksAppearanceHexRgba_(q.imageOverlayColor2,q.imageOverlayOpacity2 == null ? q.imageOverlayOpacity : q.imageOverlayOpacity2,"#000000")+")",
      "--picks-theme-image-overlay-angle:"+confidenceThemeNumber_(q.imageOverlayAngle,0,360,0)+"deg",
      "--picks-theme-wager-columns:"+(Number(q.wagerColumns)||2),
      "--picks-theme-details-bg:"+picksAppearanceHexRgba_(details.background,details.opacity,"#0b1220"),
      "--picks-theme-details-text:"+(details.text||"#cbd5e1"),
      "--picks-theme-details-border:"+(details.border||"#334155"),
      "--picks-theme-details-radius:"+(Number(details.radius)||10)+"px",
      "--picks-theme-sort-bg:"+(bars.sortBackground||"#0f172a"),
      "--picks-theme-sort-gradient:linear-gradient("+confidenceThemeNumber_(bars.sortGradientAngle,0,360,90)+"deg,"+confidenceThemeSafeColor_(bars.sortGradientStart||bars.sortBackground,"#0f172a")+","+confidenceThemeSafeColor_(bars.sortGradientEnd,"#1e293b")+")",
      "--picks-theme-sort-text:"+(bars.sortText||"#ffffff"),
      "--picks-theme-save-bg:"+(bars.saveBackground||"#2563eb"),
      "--picks-theme-save-gradient:linear-gradient("+confidenceThemeNumber_(bars.saveGradientAngle,0,360,90)+"deg,"+confidenceThemeSafeColor_(bars.saveGradientStart||bars.saveBackground,"#2563eb")+","+confidenceThemeSafeColor_(bars.saveGradientEnd,"#1d4ed8")+")",
      "--picks-theme-save-text:"+(bars.saveText||"#ffffff"),
      "--picks-theme-bar-radius:"+(Number(bars.buttonRadius)||9)+"px",
      "--picks-theme-winner-solid:"+picksAppearanceHexRgba_(winner.color,winner.opacity,"#22c55e"),
      "--picks-theme-winner-gradient:linear-gradient("+confidenceThemeNumber_(winner.angle,0,360,135)+"deg,"+picksAppearanceHexRgba_(winner.color,winner.opacity,"#22c55e")+","+picksAppearanceHexRgba_(winner.color2,winner.opacity,"#14532d")+")",
      "--picks-theme-winner-decoration-size:"+confidenceThemeNumber_(winner.decorationSize,12,64,28)+"px",
      "--picks-theme-winner-decoration-color:"+confidenceThemeSafeColor_(winner.decorationColor,"#facc15")
    ].join(";");
    const classes = [
      q.imageTextOverlay === true ? "picks-theme-image-text-overlay" : "",
      "picks-theme-page-bg-"+pageMode,
      "picks-theme-header-bg-"+headerMode,
      "picks-theme-question-bg-"+cardMode,
      "picks-theme-question-header-bg-"+qHeaderMode,
      "picks-theme-answer-bg-"+answerMode,
      "picks-theme-selected-bg-"+selectedMode,
      "picks-theme-sort-bg-"+sortMode,
      "picks-theme-save-bg-"+saveMode,
      "picks-theme-image-overlay-"+confidenceThemeToken_(q.imageOverlayMode,["solid","gradient"],"gradient"),
      "picks-theme-image-overlay-placement-"+confidenceThemeToken_(q.imageOverlayPlacement,["bottom","top","full"],"bottom"),
      "picks-theme-winner-overlay-"+winnerType,
      "picks-theme-winner-placement-"+winnerPlacement,
      "picks-theme-winner-decoration-"+winnerDecoration,
      "picks-theme-winner-decoration-position-"+winnerDecorationPosition
    ].filter(Boolean);
    return {style:style,className:classes.join(" ")};
  }

  global.AppearanceThemeRuntime = {
    confidencePresentation: confidencePresentation,
    pagePresentation: pagePresentation
  };
})(window);
