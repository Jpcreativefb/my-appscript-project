const fs = require('fs');
const path = require('path');
const assert = require('assert');
const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const engine = read('backend/engines/NotificationsEngine.js');
const team = read('backend/engines/SportsTeamFantasyEngine.js');

[
  'TEAM FANTASY v1.2.18j PARTICIPANTS',
  'teamFantasyParticipantUsernames_',
  'TEAM FANTASY v1.2.18j MISSING PICKS',
  'teamFantasyNotificationOutstandingSummary_',
  'v1.2.18j AUTOMATIC OUTSTANDING-PICK REMINDER SCHEDULING',
  'notificationPushRunScheduledPickReminders',
  'notificationPushProcessScheduledGame_',
  'notificationPushReminderOffsets_',
  'audience: "missing_picks"'
].forEach(text => assert(engine.includes(text), 'NotificationsEngine compatibility contract missing: ' + text));

assert(team.includes('function teamFantasyNotificationOutstandingSummary_('), 'Team Fantasy outstanding summary helper missing from SportsTeamFantasyEngine');
assert(team.includes('function teamFantasyParticipantUsernames_('), 'Team Fantasy participant helper missing from SportsTeamFantasyEngine');
console.log('v1.2.18j4 automatic reminder + Team Fantasy compatibility tests passed.');
