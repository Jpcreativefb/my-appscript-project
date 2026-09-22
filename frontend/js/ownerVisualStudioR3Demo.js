/* R3 preview-only fixture adapter. Preserves R2 fixture data and pure game renderer calls.
 * No persistence/controller imports. Temporary renderer globals are restored synchronously.
 */
(function(window){
  "use strict";
  const document=window.document;
  let state={};
  const OVS_PANEL_ID="pattcStudioR3";
  const setTimeout=function(){}; // Fixture scroll callbacks must not escape the transaction.
  const setStatus_=function(){};
  const selectedLabel_=function(){return "";};
  const closestSection_=function(){return document.getElementById("app");};
  const layoutTarget_=function(node){return node;};
  function html_(value){return String(value==null?"":value).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}
  function demoRememberNode_(node){
    if(!node) return null;

    const already=(state.demoSnapshots||[]).find(function(x){
      return x && x.node===node;
    });

    if(already) return already;

    const holder=document.createDocumentFragment();

    while(node.firstChild){
      holder.appendChild(node.firstChild);
    }

    const snap={
      node:node,
      holder:holder
    };

    state.demoSnapshots=state.demoSnapshots||[];
    state.demoSnapshots.push(snap);

    return snap;
  }

  function demoRestoreNodes_(){
    (state.demoSnapshots||[]).slice().reverse().forEach(function(snap){
      const node=snap && snap.node;
      if(!node || !node.isConnected) return;

      while(node.firstChild){
        node.removeChild(node.firstChild);
      }

      if(snap.holder){
        node.appendChild(snap.holder);
      }
    });

    state.demoSnapshots=[];
  }

  function demoCaptureTfGlobals_(){
    if(state.demoGlobals) return;

    const names=[
      "TEAM_FANTASY_GAME_DAY",
      "TEAM_FANTASY_GAME_DAY_VIEW",
      "TEAM_FANTASY_COMPARE_SELECTED",
      "CONFIDENCE_RC24A_COMPLETION_STATE",
      "CONFIDENCE_RC24A_COMPLETION_LOADING",
      "SURVIVOR_PAGE_STATE",
      "SURVIVOR_RC24A_COMPARE_WEEK",
      "VOTING_PAGE_STATE"
    ];

    state.demoGlobals={};

    names.forEach(function(name){
      state.demoGlobals[name]={
        exists:Object.prototype.hasOwnProperty.call(window,name),
        value:window[name]
      };
    });
  }

  function demoRestoreTfGlobals_(){
    const saved=state.demoGlobals||{};

    Object.keys(saved).forEach(function(name){
      if(saved[name].exists){
        window[name]=saved[name].value;
      }else{
        try{ delete window[name]; }
        catch(err){ window[name]=undefined; }
      }
    });

    state.demoGlobals=null;
  }

  function demoTfIsPage_(){
    return !!(
      document.getElementById("tfGameDayMount") ||
      document.getElementById("tfLeaderboardMount") ||
      document.querySelector(".tf-lineup-card")
    );
  }

  function demoTfLogo_(abbr){
    if(typeof teamFantasyTeamLogoUrl_==="function"){
      try{return teamFantasyTeamLogoUrl_(abbr);}catch(err){}
    }

    const key=String(abbr||"").toLowerCase();
    return key
      ? "https://a.espncdn.com/i/teamlogos/nfl/500/"+encodeURIComponent(key)+".png"
      : "";
  }

  function demoTfTeams_(){
    return [
      {position:"QB",label:"QB",abbr:"BUF",name:"Buffalo Bills"},
      {position:"RB",label:"RB",abbr:"DET",name:"Detroit Lions"},
      {position:"WRTE",label:"WR/TE",abbr:"MIN",name:"Minnesota Vikings"},
      {position:"K",label:"K",abbr:"DAL",name:"Dallas Cowboys"},
      {position:"OL",label:"OL",abbr:"PHI",name:"Philadelphia Eagles"},
      {position:"DL",label:"DL",abbr:"PIT",name:"Pittsburgh Steelers"},
      {position:"LB",label:"LB",abbr:"SF",name:"San Francisco 49ers"},
      {position:"DB",label:"DB",abbr:"CHI",name:"Chicago Bears"}
    ];
  }

  function demoTfStatusFor_(index){
    const mode=String(state.demoState||"in-progress");

    if(mode==="empty") return "upcoming";
    if(mode==="final") return "final";
    if(mode==="locked") return "upcoming";

    if(mode==="live"){
      if(index<5) return "live";
      if(index<7) return "final";
      return "upcoming";
    }

    // In Progress
    if(index<2) return "final";
    if(index<5) return "live";
    return "upcoming";
  }

  function demoTfPoints_(index,status,offset){
    if(status==="upcoming") return 0;

    const base=[
      25.4,
      18.7,
      21.2,
      10.0,
      14.8,
      17.6,
      13.4,
      15.9
    ][index] || 0;

    return Math.max(
      0,
      Math.round((base+Number(offset||0))*10)/10
    );
  }

  function demoTfSlotSet_(offset,hideUpcoming){
    return demoTfTeams_().map(function(team,index){
      const status=demoTfStatusFor_(index);
      const hidden=
        hideUpcoming===true &&
        (status==="upcoming" || state.demoState==="locked");

      return {
        position:team.position,
        label:team.label,
        teamAbbr:team.abbr,
        teamName:team.name,
        logoUrl:demoTfLogo_(team.abbr),
        fantasyPoints:demoTfPoints_(index,status,offset),
        weekRank:index+1,
        status:status,
        hidden:hidden,
        empty:state.demoState==="empty",
        pickMethod:index===2 ? "random" : (index===5 ? "auto" : "manual")
      };
    });
  }

  function demoTfCompetitor_(id,label,rank,offset){
    const slots=demoTfSlotSet_(offset,true);

    const total=slots.reduce(function(sum,slot){
      return sum+(
        slot.hidden===true ||
        slot.empty===true
          ? 0
          : Number(slot.fantasyPoints||0)
      );
    },0);

    return {
      entryId:id,
      label:label,
      isViewer:false,
      participated:true,
      dnp:false,
      totalPoints:Math.round(total*10)/10,
      weeklyLeagueRank:rank,
      weeklyRecord:{
        wins:Math.max(0,5-rank),
        losses:Math.max(0,rank-1),
        ties:rank===3 ? 1 : 0
      },
      weeklyRecordFinal:state.demoState==="final",
      record:{
        wins:10-rank,
        losses:rank+1,
        ties:rank===4 ? 1 : 0
      },
      leagueRank:rank,
      slots:slots
    };
  }

  function demoTfFixture_(){
    const competitors=[
      demoTfCompetitor_("demo-alex","Alex · Demo",1,3.2),
      demoTfCompetitor_("demo-jordan","Jordan · Demo",2,1.4),
      demoTfCompetitor_("demo-casey","Casey · Demo",3,-0.8),
      demoTfCompetitor_("demo-taylor","Taylor · Demo",4,-2.1),
      demoTfCompetitor_("demo-morgan","Morgan · Demo",5,-4.0)
    ];

    const rows=competitors.map(function(c,index){
      const live=c.slots.filter(function(x){
        return x.status==="live";
      }).length;

      const final=c.slots.filter(function(x){
        return x.status==="final";
      }).length;

      const upcoming=c.slots.filter(function(x){
        return x.status==="upcoming";
      }).length;

      return {
        entryId:c.entryId,
        label:c.label,
        weekRank:index+1,
        points:c.totalPoints,
        isViewer:false,
        counts:{
          final:final,
          live:live,
          upcoming:upcoming
        }
      };
    });

    return {
      success:true,
      demo:true,
      week:6,
      selectedWeek:6,
      currentWeek:6,
      leagueId:"visual-studio-demo",
      selectedLeagueId:"visual-studio-demo",
      leagueName:"Visual Studio Demo League",
      leagues:[
        {
          leagueId:"visual-studio-demo",
          leagueName:"Visual Studio Demo League"
        }
      ],
      availableWeeks:[1,2,3,4,5,6],
      privacy:"DEMO ONLY · Upcoming opponent picks are intentionally shown as locked.",
      weeklyLeaderboard:{
        rows:rows
      },
      competitors:competitors
    };
  }

  function demoTfLineupSlotHtml_(slot,index){
    const empty=state.demoState==="empty";
    const locked=
      state.demoState==="locked" ||
      slot.status==="final";

    const status=String(slot.status||"upcoming");
    const statusWord=status.toUpperCase();

    if(empty){
      return '<div class="tf-slot tf-slot-compact needs-pick is-upcoming" data-position="'+
        html_(slot.position)+
        '" data-missing="true">'+
        '<strong class="tf-slot-position">'+html_(slot.label)+'</strong>'+
        '<span class="tf-slot-status-word">UPCOMING</span>'+
        '<button type="button" class="tf-team-picker-button" disabled>'+
        '<span class="tf-pick-empty">+ Choose</span>'+
        '<span class="tf-slot-live-line">Rank #'+(index+1)+'</span>'+
        '<span class="tf-slot-points-r3">0 pts</span>'+
        '</button></div>';
    }

    const liveLine=
      status==="live"
        ? "LIVE · Q3 7:42"
        : status==="final"
          ? "FINAL · 27–20"
          : "Sun 12:00 PM";

    return '<div class="tf-slot tf-slot-compact has-pick is-'+
      html_(status)+
      (locked?' is-locked':'')+
      '" data-position="'+html_(slot.position)+'" data-missing="false">'+
      '<strong class="tf-slot-position">'+html_(slot.label)+'</strong>'+
      '<span class="tf-slot-status-word">'+html_(statusWord)+'</span>'+
      '<button type="button" class="tf-team-picker-button has-team" disabled>'+
      '<img src="'+html_(slot.logoUrl)+'" alt="">'+
      '<span class="tf-team-line-r3">'+
      '<span class="tf-team-name">'+html_(slot.teamName)+'</span>'+
      (slot.pickMethod==="random"
        ? '<span class="tf-origin">R</span>'
        : slot.pickMethod==="auto"
          ? '<span class="tf-origin">AP</span>'
          : '')+
      '</span>'+
      '<span class="tf-slot-live-line">'+html_(liveLine)+'</span>'+
      '<span class="tf-slot-points-r3">'+
      html_(String(slot.fantasyPoints))+
      ' pts</span>'+
      '<span class="tf-slot-usage">'+
      html_(String(Math.max(0,3-(index%3))))+
      ' uses left</span>'+
      (locked
        ? '<span class="tf-lock-copy">🔒 Locked</span>'
        : '<span class="tf-edit-label">Edit · Make Changes Before Kickoff</span>')+
      '</button></div>';
  }

  function demoTfPopulateLineup_(){
    const grid=document.querySelector(".tf-lineup-card .tf-slot-grid");
    if(!grid) return;

    demoRememberNode_(grid);

    const slots=demoTfSlotSet_(0,false);

    grid.innerHTML=slots.map(function(slot,index){
      return demoTfLineupSlotHtml_(slot,index);
    }).join("");
  }

  function demoTfPopulateLeaderboard_(fixture){
    const mount=document.getElementById("tfLeaderboardMount");
    if(!mount) return;

    demoRememberNode_(mount);

    if(typeof teamFantasyRenderWeeklyLeague_==="function"){mount.innerHTML=teamFantasyRenderWeeklyLeague_(fixture);demoTfDisableControls_(mount);return;}
    const rows=fixture.weeklyLeaderboard.rows||[];
    const hasLive=rows.some(function(row){
      return row.counts && Number(row.counts.live||0)>0;
    });

    mount.innerHTML=
      '<div class="tf-week-chip-row">'+
        [1,2,3,4,5,6].map(function(w){
          return '<button type="button" class="tf-week-chip '+(w===6?'is-active':'')+'" disabled>Week '+w+'</button>';
        }).join("")+
        '<button type="button" class="tf-week-chip" disabled>Season</button>'+
      '</div>'+
      '<div class="tf-history-week-head">'+
        '<strong>'+(hasLive?'LIVE ':'')+'WEEK 6 · DEMO</strong>'+
        '<span>'+rows.length+' dummy players</span>'+
      '</div>'+
      '<div class="tf-leaderboard-list">'+
        rows.map(function(row){
          return '<div class="tf-leader-row">'+
            '<span class="rank">#'+html_(row.weekRank)+'</span>'+
            '<span class="name">'+html_(row.label)+'</span>'+
            '<span class="value">'+html_(String(row.points))+' pts</span>'+
          '</div>';
        }).join("")+
      '</div>';
  }

  function demoTfPopulateHistory_(){
    const mount=document.getElementById("tfHistoryMount");
    if(!mount) return;

    demoRememberNode_(mount);

    const slots=demoTfSlotSet_(-1.2,false);

    mount.innerHTML=
      '<div class="tf-week-chip-row">'+
        [1,2,3,4,5,6].map(function(w){
          return '<button type="button" class="tf-week-chip '+(w===5?'is-active':'')+'" disabled>Week '+w+'</button>';
        }).join("")+
      '</div>'+
      '<div class="tf-history-week-head">'+
        '<strong>Week 5 · FINAL · 124.6 pts · DEMO</strong>'+
        '<span>#2 weekly finish</span>'+
      '</div>'+
      '<div class="tf-history-slots">'+
        slots.map(function(slot){
          return '<div class="tf-history-slot">'+
            '<div class="pos">'+html_(slot.label)+'</div>'+
            '<div class="main">'+html_(slot.teamAbbr)+'</div>'+
            '<div class="meta">'+
              html_(String(slot.fantasyPoints))+
              ' pts · Rank #'+
              html_(slot.weekRank)+
              ' · FINAL'+
            '</div>'+
          '</div>';
        }).join("")+
      '</div>';
  }

  function demoTfPopulatePlayoffs_(){
    const list=document.querySelector("#teamFantasyPlayoffs .tf-playoff-list");
    if(!list) return;

    demoRememberNode_(list);

    const players=[
      ["Alex · Demo",1,"10-2-0","1248.7","Currently In",true],
      ["Jordan · Demo",2,"9-3-0","1204.1","Currently In",true],
      ["Casey · Demo",3,"8-4-0","1166.4","Currently In",true],
      ["Taylor · Demo",4,"7-5-0","1112.8","PLAYOFF LINE",true],
      ["Morgan · Demo",5,"6-6-0","1081.5","Currently Out",false],
      ["Riley · Demo",6,"5-7-0","1030.2","Currently Out",false]
    ];

    list.innerHTML=players.map(function(row){
      return '<div class="tf-playoff-row '+(row[5]?'is-in':'')+(row[0].indexOf("Taylor")===0?' is-cutoff':'')+'">'+
        '<span class="rank">#'+row[1]+'</span>'+
        '<span class="name">'+html_(row[0])+
          '<span class="tf-playoff-status">'+html_(row[4])+'</span>'+
        '</span>'+
        '<span class="value">'+html_(row[2])+' · '+html_(row[3])+' pts</span>'+
      '</div>';
    }).join("");
  }

  function demoTfDisableControls_(root){
    if(!root || !root.querySelectorAll) return;

    root.querySelectorAll("button,select,input").forEach(function(el){
      el.disabled=true;
      el.setAttribute("title","Visual Studio demo preview only");
    });
  }

  function demoTfPopulateGameDay_(fixture,mode){
    const mount=document.getElementById("tfGameDayMount");
    if(!mount) return false;

    demoRememberNode_(mount);

    if(
      mode==="compare" &&
      typeof teamFantasyRenderCompareBoard_==="function"
    ){
      mount.innerHTML=
        '<div class="tf-history-week-head">'+
          '<strong>ACTUAL COMPARE VIEW · DEMO WEEK 6</strong>'+
          '<span>3 dummy players</span>'+
        '</div>'+
        '<div id="tfCompareBoard">'+
          teamFantasyRenderCompareBoard_(
            fixture,
            ["demo-alex","demo-jordan","demo-casey"]
          )+
        '</div>';

      demoTfDisableControls_(mount);
      return true;
    }

    if(typeof teamFantasyRenderWeeklyLeague_==="function"){
      mount.innerHTML=
        '<div class="tf-history-week-head">'+
          '<strong>WEEKLY STANDINGS · DEMO WEEK 6</strong>'+
          '<span>'+fixture.weeklyLeaderboard.rows.length+' dummy players</span>'+
        '</div>'+
        teamFantasyRenderWeeklyLeague_(fixture);

      demoTfDisableControls_(mount);
      return true;
    }

    return false;
  }

  function enableTeamFantasyDemo_(){
    const fixture=demoTfFixture_();

    demoCaptureTfGlobals_();

    window.TEAM_FANTASY_GAME_DAY=fixture;
    window.TEAM_FANTASY_COMPARE_SELECTED=[
      "demo-alex",
      "demo-jordan",
      "demo-casey"
    ];

    demoTfPopulateLineup_();
    demoTfPopulateLeaderboard_(fixture);
    demoTfPopulateHistory_();
    demoTfPopulatePlayoffs_();

    let view=String(state.demoFixture||"full");

    if(view==="auto"){
      view=/compare/i.test(selectedLabel_())
        ? "compare"
        : "league";
    }

    if(view==="leaderboard"){
      view="league";
    }

    if(view==="full"){
      view="compare";
    }

    window.TEAM_FANTASY_GAME_DAY_VIEW=
      view==="compare"
        ? "compare"
        : "league";

    const gameDayOk=demoTfPopulateGameDay_(
      fixture,
      window.TEAM_FANTASY_GAME_DAY_VIEW
    );

    setStatus_(
      gameDayOk
        ? "Team Fantasy DEMO loaded in the real Weekly Picks, Leaderboard, History, Playoff Picture and Standings / Compare sections."
        : "Team Fantasy DEMO loaded. The Standings / Compare mount was not present on this page."
    );

    return true;
  }

  function demoFixtureHtml_(kind){
    if(String(kind)==="compare"){
      return '<section class="card pattc-vs-demo-fixture" style="padding:14px;margin:10px 0">'+
        '<h2>Compare Preview</h2>'+
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'+
          '<div class="card" style="padding:10px"><strong>Alex · Demo</strong><div>127.4 pts</div><small>8–3 · #2</small></div>'+
          '<div class="card" style="padding:10px"><strong>Jordan · Demo</strong><div>121.8 pts</div><small>7–4 · #5</small></div>'+
        '</div>'+
      '</section>';
    }

    return '<section class="card pattc-vs-demo-fixture" style="padding:14px;margin:10px 0">'+
      '<h2>Leaderboard Preview</h2>'+
      '<div style="display:grid;gap:8px">'+
        '<div><strong>#1 Alex · Demo</strong> · 142.7 pts · 9–2</div>'+
        '<div><strong>#2 Jordan · Demo</strong> · 136.2 pts · 8–3</div>'+
        '<div><strong>#3 Casey · Demo</strong> · 127.4 pts · 8–3</div>'+
        '<div><strong>#4 Taylor · Demo</strong> · 121.8 pts · 7–4</div>'+
      '</div>'+
    '</section>';
  }

  function demoFixtureTarget_(){
    const app=document.getElementById("app");
    const section=state.selectedSection||closestSection_(state.selected);
    return (section&&layoutTarget_(section))||app;
  }

  function demoConfidenceIsPage_(){
    const list=document.getElementById("picksCategoryList");

    return !!(
      list &&
      (
        document.getElementById("confidenceRc24aMyWeek") ||
        list.querySelector(".rc24k-confidence-row") ||
        list.querySelector(".confidence-game-row")
      )
    );
  }

  function demoConfidenceLogo_(abbr){
    const key=String(abbr||"").toLowerCase();

    return key
      ? "https://a.espncdn.com/i/teamlogos/nfl/500/"+
        encodeURIComponent(key)+
        ".png"
      : "";
  }

  function demoConfidenceCompletionFixture_(){
    const mode=String(state.demoState||"in-progress");

    const allFinal=mode==="final";
    const allLocked=mode==="locked";
    const empty=mode==="empty";

    const gamesRemaining=
      allFinal
        ? 0
        : empty
          ? 6
          : 2;

    const currentPoints=
      allFinal
        ? 31
        : empty
          ? 0
          : 18;

    const status=
      allFinal
        ? "FINAL"
        : allLocked
          ? "LOCKED"
          : mode==="live"
            ? "LIVE"
            : empty
              ? "OPEN"
              : "IN PROGRESS";

    const matchupSet=function(playerIndex){
      const teams=[
        ["BUF","Buffalo Bills"],
        ["DET","Detroit Lions"],
        ["MIN","Minnesota Vikings"],
        ["DAL","Dallas Cowboys"],
        ["PHI","Philadelphia Eagles"],
        ["CHI","Chicago Bears"]
      ];

      return teams.map(function(team,index){
        const hidden=
          allLocked ||
          (
            mode!=="final" &&
            index>=4 &&
            playerIndex>0
          );

        let result="pending";
        let earned=null;

        if(allFinal || index<2){
          result=(index+playerIndex)%3===0
            ? "loss"
            : "win";

          earned=result==="win"
            ? (index+1)
            : 0;
        }

        return {
          hidden:hidden,
          teamId:team[0],
          team:team[1],
          logo:demoConfidenceLogo_(team[0]),
          confidencePoints:index===0 ? 5 : index===1 ? 3 : 0,
          pointsEarned:earned,
          result:result
        };
      });
    };

    const standings=[
      ["Alex · Demo",1,34,8,"FINAL"],
      ["Jordan · Demo",2,31,10,status],
      ["Casey · Demo",3,28,12,status],
      ["Taylor · Demo",4,24,14,status],
      ["Morgan · Demo",5,21,16,status],
      ["Riley · Demo",6,18,18,status]
    ].map(function(row){
      return {
        displayName:row[0],
        username:row[0],
        place:row[1],
        points:row[2],
        possibleRemaining:allFinal ? 0 : row[3],
        status:row[4]
      };
    });

    const weeks=[];

    for(let w=1;w<=6;w++){
      weeks.push({
        week:w,
        gameId:"demo-confidence-week-"+w,
        played:w<=5 || allFinal,
        points:w<=5 ? 12+w*3 : currentPoints,
        place:(w%4)+1
      });
    }

    const trends=[
      ["Buffalo Bills",4,3,75,"BUF"],
      ["Detroit Lions",4,3,75,"DET"],
      ["Minnesota Vikings",3,2,67,"MIN"],
      ["Philadelphia Eagles",3,3,100,"PHI"],
      ["Chicago Bears",2,1,50,"CHI"]
    ].map(function(row){
      return {
        team:row[0],
        selections:row[1],
        correct:row[2],
        winPercentage:row[3],
        logo:demoConfidenceLogo_(row[4])
      };
    });

    return {
      success:true,
      demo:true,
      week:6,
      winningPlaces:3,

      myWeek:{
        currentPoints:currentPoints,
        currentPlace:empty ? null : 3,
        possibleRemaining:allFinal ? 0 : 14,
        maximumPossible:allFinal ? 31 : 32,
        gamesRemaining:gamesRemaining,
        status:status
      },

      standings:standings,

      season:{
        weeksPlayed:allFinal ? 6 : 5,
        totalPoints:126,
        seasonRank:2,
        weeklyWins:1,
        weeks:weeks
      },

      leagueContext:{
        leagueId:"visual-studio-demo",
        leagues:[
          {
            leagueId:"visual-studio-demo",
            leagueName:"Visual Studio Demo League"
          },
          {
            leagueId:"visual-studio-demo-2",
            leagueName:"Demo League 2"
          }
        ]
      },

      compare:[
        {
          username:"demo-alex",
          displayName:"Alex · Demo",
          points:34,
          possibleRemaining:allFinal ? 0 : 8,
          matchups:matchupSet(0)
        },
        {
          username:"demo-jordan",
          displayName:"Jordan · Demo",
          points:31,
          possibleRemaining:allFinal ? 0 : 10,
          matchups:matchupSet(1)
        },
        {
          username:"demo-casey",
          displayName:"Casey · Demo",
          points:28,
          possibleRemaining:allFinal ? 0 : 12,
          matchups:matchupSet(2)
        },
        {
          username:"demo-taylor",
          displayName:"Taylor · Demo",
          points:24,
          possibleRemaining:allFinal ? 0 : 14,
          matchups:matchupSet(3)
        }
      ],

      trends:trends,
      allTrends:trends
    };
  }

  function demoConfidenceTeamHtml_(
    abbr,
    city,
    nickname,
    score,
    selected,
    winner,
    dim
  ){
    return '<button type="button" '+
      'class="confidence-team-choice confidence-team-team '+
      (selected?'selected ':'')+
      (dim?'not-selected ':'')+
      (winner?'actual-winner ':'')+
      '" disabled title="Visual Studio demo preview only">'+

      '<span class="confidence-team-visual confidence-element-team-image">'+
        '<img class="confidence-team-logo" src="'+
        html_(demoConfidenceLogo_(abbr))+
        '" alt="">'+
      '</span>'+

      '<span class="confidence-team-text">'+
        '<span class="confidence-team-city confidence-element-city">'+
          html_(city)+
        '</span>'+
        '<strong class="confidence-team-nickname confidence-element-team-name">'+
          html_(nickname)+
        '</strong>'+
      '</span>'+

      (score!=="" && score!==null
        ? '<strong class="confidence-team-score confidence-element-score">'+
          html_(score)+
          '</strong>'
        : '')+

      (selected
        ? '<span class="confidence-selected-mark confidence-element-result-indicator">✓</span>'+
          '<span class="confidence-winner-decoration" aria-hidden="true"></span>'
        : '')+

      (winner
        ? '<span class="confidence-winner-mark">W</span>'
        : '')+

      '</button>';
  }

  function demoConfidenceRow_(cfg,index){
    const picked=cfg.picked===true;
    const locked=cfg.locked===true;
    const phase=String(cfg.phase||"pregame");
    const outcome=String(cfg.outcome||"pending");
    const confidence=cfg.confidence||"";
    const selectedSide=cfg.selectedSide||"away";

    const awaySelected=picked && selectedSide==="away";
    const homeSelected=picked && selectedSide==="home";

    return '<article class="confidence-game-row rc24k-confidence-row '+
      html_(outcome)+
      ' phase-'+
      html_(phase)+
      '" data-category-id="demo-confidence-'+
      index+
      '" data-locked="'+
      (locked?'true':'false')+
      '">'+

      '<div class="confidence-matchup-state">'+
        '<strong>'+html_(cfg.status)+'</strong>'+
        '<span>'+
          (locked
            ? "LOCKED"
            : picked
              ? "SAVED · Locks at kickoff"
              : "OPEN · Locks at kickoff")+
        '</span>'+
      '</div>'+

      '<div class="rc24k-confidence-picks">'+

        demoConfidenceTeamHtml_(
          cfg.awayAbbr,
          cfg.awayCity,
          cfg.awayName,
          cfg.awayScore,
          awaySelected,
          cfg.awayWinner===true,
          picked && !awaySelected
        )+

        '<div class="confidence-versus confidence-element-versus" aria-hidden="true">VS</div>'+

        demoConfidenceTeamHtml_(
          cfg.homeAbbr,
          cfg.homeCity,
          cfg.homeName,
          cfg.homeScore,
          homeSelected,
          cfg.homeWinner===true,
          picked && !homeSelected
        )+

      '</div>'+

      '<div class="rc24k-confidence-control '+
        (picked?'is-ready':'is-waiting')+
        '">'+

        '<label class="confidence-row-value">'+
          '<span class="confidence-value-label">CONF</span>'+
          '<select class="confidence-value-input" disabled title="Visual Studio demo preview only">'+
            '<option>'+
              (confidence==="" ? "—" : html_(confidence))+
            '</option>'+
          '</select>'+

          (cfg.pointsLabel
            ? '<strong class="confidence-result-points confidence-element-points '+
              html_(outcome)+
              '">'+
              html_(cfg.pointsLabel)+
              ' pts</strong>'
            : '')+

        '</label>'+

        '<small class="rc24k-confidence-save-state">'+
          (phase==="final"
            ? "FINAL"
            : locked
              ? "Locked at kickoff"
              : picked
                ? "Saved ✓"
                : "Choose winner")+
        '</small>'+
      '</div>'+

    '</article>';
  }

  function demoConfidenceRows_(){
    const mode=String(state.demoState||"in-progress");

    if(mode==="empty"){
      return [
        {
          status:"SUN 12:00 PM",
          phase:"pregame",
          picked:false,
          awayAbbr:"BUF",
          awayCity:"Buffalo",
          awayName:"Bills",
          homeAbbr:"NYJ",
          homeCity:"New York",
          homeName:"Jets",
          awayScore:"",
          homeScore:""
        },
        {
          status:"SUN 3:25 PM",
          phase:"pregame",
          picked:false,
          awayAbbr:"DET",
          awayCity:"Detroit",
          awayName:"Lions",
          homeAbbr:"CHI",
          homeCity:"Chicago",
          homeName:"Bears",
          awayScore:"",
          homeScore:""
        }
      ];
    }

    if(mode==="locked"){
      return [
        {
          status:"KICKOFF",
          phase:"live",
          picked:true,
          locked:true,
          selectedSide:"away",
          confidence:5,
          awayAbbr:"BUF",
          awayCity:"Buffalo",
          awayName:"Bills",
          homeAbbr:"NYJ",
          homeCity:"New York",
          homeName:"Jets",
          awayScore:0,
          homeScore:0
        },
        {
          status:"KICKOFF",
          phase:"live",
          picked:true,
          locked:true,
          selectedSide:"home",
          confidence:3,
          awayAbbr:"DET",
          awayCity:"Detroit",
          awayName:"Lions",
          homeAbbr:"CHI",
          homeCity:"Chicago",
          homeName:"Bears",
          awayScore:0,
          homeScore:0
        }
      ];
    }

    if(mode==="final"){
      return [
        {
          status:"FINAL",
          phase:"final",
          outcome:"correct",
          picked:true,
          locked:true,
          selectedSide:"away",
          confidence:5,
          pointsLabel:"+5",
          awayWinner:true,
          awayAbbr:"BUF",
          awayCity:"Buffalo",
          awayName:"Bills",
          homeAbbr:"NYJ",
          homeCity:"New York",
          homeName:"Jets",
          awayScore:27,
          homeScore:17
        },
        {
          status:"FINAL",
          phase:"final",
          outcome:"incorrect",
          picked:true,
          locked:true,
          selectedSide:"away",
          confidence:4,
          pointsLabel:"0",
          homeWinner:true,
          awayAbbr:"DET",
          awayCity:"Detroit",
          awayName:"Lions",
          homeAbbr:"CHI",
          homeCity:"Chicago",
          homeName:"Bears",
          awayScore:20,
          homeScore:24
        },
        {
          status:"FINAL",
          phase:"final",
          outcome:"correct",
          picked:true,
          locked:true,
          selectedSide:"home",
          confidence:"",
          pointsLabel:"+1",
          homeWinner:true,
          awayAbbr:"DAL",
          awayCity:"Dallas",
          awayName:"Cowboys",
          homeAbbr:"PHI",
          homeCity:"Philadelphia",
          homeName:"Eagles",
          awayScore:21,
          homeScore:31
        }
      ];
    }

    const liveRows=[
      {
        status:"LIVE · Q3 7:42",
        phase:"live",
        outcome:"pending",
        picked:true,
        locked:true,
        selectedSide:"away",
        confidence:5,
        awayAbbr:"BUF",
        awayCity:"Buffalo",
        awayName:"Bills",
        homeAbbr:"NYJ",
        homeCity:"New York",
        homeName:"Jets",
        awayScore:21,
        homeScore:13
      },
      {
        status:"FINAL",
        phase:"final",
        outcome:"correct",
        picked:true,
        locked:true,
        selectedSide:"home",
        confidence:3,
        pointsLabel:"+3",
        homeWinner:true,
        awayAbbr:"MIN",
        awayCity:"Minnesota",
        awayName:"Vikings",
        homeAbbr:"CHI",
        homeCity:"Chicago",
        homeName:"Bears",
        awayScore:17,
        homeScore:23
      },
      {
        status:"SUN 7:20 PM",
        phase:"pregame",
        outcome:"pending",
        picked:true,
        locked:false,
        selectedSide:"away",
        confidence:"",
        awayAbbr:"DAL",
        awayCity:"Dallas",
        awayName:"Cowboys",
        homeAbbr:"PHI",
        homeCity:"Philadelphia",
        homeName:"Eagles",
        awayScore:"",
        homeScore:""
      },
      {
        status:"MON 7:15 PM",
        phase:"pregame",
        outcome:"pending",
        picked:false,
        locked:false,
        awayAbbr:"SF",
        awayCity:"San Francisco",
        awayName:"49ers",
        homeAbbr:"SEA",
        homeCity:"Seattle",
        homeName:"Seahawks",
        awayScore:"",
        homeScore:""
      }
    ];

    return liveRows;
  }

  function enableConfidenceDemo_(){
    const list=document.getElementById("picksCategoryList");
    if(!list) return false;

    demoCaptureTfGlobals_();

    const fixture=demoConfidenceCompletionFixture_();

    try{
      window.CONFIDENCE_RC24A_COMPLETION_STATE=fixture;
      window.CONFIDENCE_RC24A_COMPLETION_LOADING=true;
    }catch(err){}

    demoRememberNode_(list);

    list.innerHTML=
      '<div class="pattc-vs-confidence-demo-slate">'+
        demoConfidenceRows_().map(function(row,index){
          return demoConfidenceRow_(row,index);
        }).join("")+
      '</div>'+
      '<div id="confidenceRc24aCompletion" class="confidence-final-completion"></div>';

    const myWeek=document.getElementById("confidenceRc24aMyWeek");

    if(myWeek){
      demoRememberNode_(myWeek);

      if(typeof confidenceRc24aMyWeekHtml_==="function"){
        myWeek.innerHTML=confidenceRc24aMyWeekHtml_(fixture);
      }
    }

    const completion=document.getElementById("confidenceRc24aCompletion");

    if(completion){
      if(
        typeof confidenceRc24aStandingsHtml_==="function" &&
        typeof confidenceRc24aSeasonHtml_==="function" &&
        typeof confidenceRc24aCompareHtml_==="function" &&
        typeof confidenceRc24aTrendsHtml_==="function"
      ){
        completion.innerHTML=
          confidenceRc24aStandingsHtml_(fixture)+
          confidenceRc24aSeasonHtml_(fixture)+
          confidenceRc24aCompareHtml_(fixture)+
          confidenceRc24aTrendsHtml_(fixture);
      }
    }

    demoTfDisableControls_(list);

    if(myWeek){
      demoTfDisableControls_(myWeek);
    }

    setStatus_(
      "Confidence DEMO loaded in the actual matchup slate, My Week, Weekly Standings, Season History, Compare and Trends sections."
    );

    return true;
  }

  function demoSurvivorIsPage_(){
    return !!document.querySelector(".survivor-page");
  }

  function demoSurvivorKind_(){
    const page=document.querySelector(".survivor-page");
    const payload=(window.SURVIVOR_PAGE_STATE&&SURVIVOR_PAGE_STATE.payload)||{};
    const mode=String(payload.mode||"").toLowerCase();
    const text=String(page&&page.textContent||"").toLowerCase();

    if(
      (page&&page.classList.contains("koth-page")) ||
      mode==="king-of-the-hill" ||
      text.indexOf("king of the hill")!==-1
    ){
      return "koth";
    }

    if(
      mode.indexOf("streak")!==-1 ||
      text.indexOf("streak survivor")!==-1
    ){
      return "streak";
    }

    return "survivor";
  }

  function demoSurvivorLogo_(abbr){
    const key=String(abbr||"").toLowerCase();

    return key
      ? "https://a.espncdn.com/i/teamlogos/nfl/500/"+
        encodeURIComponent(key)+
        ".png"
      : "";
  }

  function demoSurvivorTeam_(cfg){
    cfg=cfg||{};

    return {
      id:String(cfg.id||cfg.abbr||"").toLowerCase(),
      name:cfg.name||cfg.abbr||"Team",
      abbr:cfg.abbr||"",
      teamAbbr:cfg.abbr||"",
      image:demoSurvivorLogo_(cfg.abbr),
      logoUrl:demoSurvivorLogo_(cfg.abbr),

      sportsGameId:cfg.gameId||"demo-survivor-game",
      matchupId:cfg.gameId||"demo-survivor-game",

      side:cfg.side||"",
      homeAway:String(cfg.side||"").toUpperCase(),
      opponent:cfg.opponent||"",

      kickoff:cfg.kickoff||"2026-09-13T12:00:00-05:00",

      teamRecord:cfg.record||"1-0",
      opponentRecord:cfg.opponentRecord||"1-0",

      spread:cfg.spread,
      moneyline:cfg.moneyline,
      total:cfg.total||47.5,
      weather:cfg.weather||"72° · Clear",

      eligible:cfg.eligible!==false,
      unavailableReason:cfg.unavailableReason||"",

      sportsResult:cfg.sportsResult||{}
    };
  }

  function demoSurvivorFixture_(){
    const kind=demoSurvivorKind_();

    if(kind==="koth"){
      return demoKothFixture_();
    }

    const mode=String(state.demoState||"in-progress");

    const isLive=mode==="live";
    const isFinal=mode==="final";
    const isLocked=mode==="locked";
    const isEmpty=mode==="empty";

    const selectedId=isEmpty ? "" : "buf";

    const sportsResult=isFinal
      ? {
          completed:true,
          state:"post",
          status:"Final",
          awayScore:27,
          homeScore:20,
          periodLabel:"FINAL"
        }
      : isLive
        ? {
            completed:false,
            state:"in",
            status:"Live",
            awayScore:21,
            homeScore:13,
            periodLabel:"Q3",
            clock:"7:42"
          }
        : {};

    const kickoff="2026-09-13T12:00:00-05:00";
    const lateKickoff="2026-09-13T15:25:00-05:00";

    const nominees=[
      demoSurvivorTeam_({
        id:"buf",
        abbr:"BUF",
        name:"Buffalo Bills",
        gameId:"demo-survivor-1",
        side:"away",
        opponent:"Miami Dolphins",
        kickoff:kickoff,
        record:"1-0",
        opponentRecord:"1-0",
        spread:-3.5,
        moneyline:-165,
        sportsResult:sportsResult
      }),

      demoSurvivorTeam_({
        id:"mia",
        abbr:"MIA",
        name:"Miami Dolphins",
        gameId:"demo-survivor-1",
        side:"home",
        opponent:"Buffalo Bills",
        kickoff:kickoff,
        record:"1-0",
        opponentRecord:"1-0",
        spread:3.5,
        moneyline:145,
        sportsResult:sportsResult
      }),

      demoSurvivorTeam_({
        id:"det",
        abbr:"DET",
        name:"Detroit Lions",
        gameId:"demo-survivor-2",
        side:"away",
        opponent:"Green Bay Packers",
        kickoff:kickoff,
        record:"1-0",
        opponentRecord:"0-1",
        spread:-2.5,
        moneyline:-140,
        eligible:false,
        unavailableReason:"used"
      }),

      demoSurvivorTeam_({
        id:"gb",
        abbr:"GB",
        name:"Green Bay Packers",
        gameId:"demo-survivor-2",
        side:"home",
        opponent:"Detroit Lions",
        kickoff:kickoff,
        record:"0-1",
        opponentRecord:"1-0",
        spread:2.5,
        moneyline:120
      }),

      demoSurvivorTeam_({
        id:"dal",
        abbr:"DAL",
        name:"Dallas Cowboys",
        gameId:"demo-survivor-3",
        side:"away",
        opponent:"Philadelphia Eagles",
        kickoff:lateKickoff,
        record:"1-0",
        opponentRecord:"1-0",
        spread:4.5,
        moneyline:175,
        eligible:false,
        unavailableReason:"used"
      }),

      demoSurvivorTeam_({
        id:"phi",
        abbr:"PHI",
        name:"Philadelphia Eagles",
        gameId:"demo-survivor-3",
        side:"home",
        opponent:"Dallas Cowboys",
        kickoff:lateKickoff,
        record:"1-0",
        opponentRecord:"1-0",
        spread:-4.5,
        moneyline:-205
      }),

      demoSurvivorTeam_({
        id:"min",
        abbr:"MIN",
        name:"Minnesota Vikings",
        gameId:"demo-survivor-4",
        side:"away",
        opponent:"Chicago Bears",
        kickoff:lateKickoff,
        record:"1-0",
        opponentRecord:"0-1",
        spread:-1.5,
        moneyline:-125,
        eligible:false,
        unavailableReason:"used"
      }),

      demoSurvivorTeam_({
        id:"chi",
        abbr:"CHI",
        name:"Chicago Bears",
        gameId:"demo-survivor-4",
        side:"home",
        opponent:"Minnesota Vikings",
        kickoff:lateKickoff,
        record:"0-1",
        opponentRecord:"1-0",
        spread:1.5,
        moneyline:105
      })
    ];

    if(isLive||isFinal||isLocked){
      nominees.forEach(function(team){
        if(team.id!==selectedId && team.eligible!==false){
          team.eligible=false;
          team.unavailableReason="started";
        }
      });
    }

    const streak=kind==="streak";

    const rounds=[
      {
        week:1,
        round:1,
        name:"Week 1",
        nomineeIds:["det"],
        pickNomineeId:"det",
        resolved:true,
        outcome:"win",
        status:"survived",
        earnedPoints:streak?10:0,
        winStreak:1,
        lossesUsed:0,
        livesRemaining:2,
        selectionResults:[{teamScore:31,opponentScore:17}]
      },

      {
        week:2,
        round:2,
        name:"Week 2",
        nomineeIds:["dal"],
        pickNomineeId:"dal",
        resolved:true,
        outcome:"win",
        status:"survived",
        earnedPoints:streak?20:0,
        winStreak:2,
        lossesUsed:0,
        livesRemaining:2,
        selectionResults:[{teamScore:27,opponentScore:20}]
      },

      {
        week:3,
        round:3,
        name:"Week 3",
        nomineeIds:["min"],
        pickNomineeId:"min",
        resolved:true,
        outcome:streak?"loss":"win",
        status:streak?"life-used":"survived",
        earnedPoints:0,
        winStreak:streak?0:3,
        lossesUsed:streak?1:0,
        livesRemaining:streak?1:2,
        selectionResults:[{teamScore:17,opponentScore:24}]
      }
    ];

    const usedTeamTrail=[
      {
        week:1,
        teamId:"det",
        team:"Detroit Lions",
        logoUrl:demoSurvivorLogo_("DET"),
        opponent:"Green Bay Packers",
        resolved:true,
        result:"win",
        survivorStatus:"survived",
        finalScore:"31-17",
        weeklyPoints:streak?10:0,
        seasonPoints:streak?10:0,
        streak:1,
        lossesUsed:0,
        livesRemaining:2
      },

      {
        week:2,
        teamId:"dal",
        team:"Dallas Cowboys",
        logoUrl:demoSurvivorLogo_("DAL"),
        opponent:"New York Giants",
        resolved:true,
        result:"win",
        survivorStatus:"survived",
        finalScore:"27-20",
        weeklyPoints:streak?20:0,
        seasonPoints:streak?30:0,
        streak:2,
        lossesUsed:0,
        livesRemaining:2
      },

      {
        week:3,
        teamId:"min",
        team:"Minnesota Vikings",
        logoUrl:demoSurvivorLogo_("MIN"),
        opponent:"Chicago Bears",
        resolved:true,
        result:streak?"loss":"win",
        survivorStatus:streak?"life-used":"survived",
        finalScore:"17-24",
        weeklyPoints:0,
        seasonPoints:streak?30:0,
        streak:streak?0:3,
        lossesUsed:streak?1:0,
        livesRemaining:streak?1:2
      }
    ];

    const standings=[
      {
        username:"demo-alex",
        displayName:"Alex · Demo",
        survivorAlive:true,
        total:streak?76:4,
        survivorWinStreak:streak?4:0,
        survivorMultiplier:streak?4:1,
        livesRemaining:2
      },

      {
        username:"demo-joel",
        displayName:"Joel · Demo",
        survivorAlive:true,
        total:streak?60:4,
        survivorWinStreak:streak?3:0,
        survivorMultiplier:streak?3:1,
        livesRemaining:streak?1:2,
        isCurrentUser:true
      },

      {
        username:"demo-casey",
        displayName:"Casey · Demo",
        survivorAlive:true,
        total:streak?52:4,
        survivorWinStreak:streak?2:0,
        survivorMultiplier:streak?2:1,
        livesRemaining:1
      },

      {
        username:"demo-riley",
        displayName:"Riley · Demo",
        survivorAlive:false,
        total:streak?28:2,
        survivorWinStreak:0,
        survivorMultiplier:1,
        livesRemaining:0,
        survivorEliminatedRound:3
      }
    ];

    const revealCurrent=isLive||isFinal||isLocked;

    const compare=standings.map(function(player,playerIndex){
      return {
        username:player.username,
        displayName:player.displayName,
        alive:player.survivorAlive!==false,
        totalPoints:player.total,

        lossesUsed:
          player.livesRemaining>0
            ? 2-player.livesRemaining
            : 2,

        livesRemaining:player.livesRemaining,

        weeks:[
          {
            week:1,
            hidden:false,
            team:"Detroit Lions",
            teamId:"det",
            logoUrl:demoSurvivorLogo_("DET"),
            opponent:"Green Bay Packers",
            finalScore:"31-17",
            result:"win",
            weeklyPoints:streak?10:0,
            streak:1
          },

          {
            week:2,
            hidden:false,
            team:"Dallas Cowboys",
            teamId:"dal",
            logoUrl:demoSurvivorLogo_("DAL"),
            opponent:"New York Giants",
            finalScore:"27-20",
            result:"win",
            weeklyPoints:streak?20:0,
            streak:2
          },

          {
            week:3,
            hidden:false,

            team:
              playerIndex%2===0
                ? "Minnesota Vikings"
                : "Chicago Bears",

            teamId:
              playerIndex%2===0
                ? "min"
                : "chi",

            logoUrl:
              demoSurvivorLogo_(
                playerIndex%2===0
                  ? "MIN"
                  : "CHI"
              ),

            opponent:
              playerIndex%2===0
                ? "Chicago Bears"
                : "Minnesota Vikings",

            finalScore:
              playerIndex%2===0
                ? "17-24"
                : "24-17",

            result:
              playerIndex%2===0
                ? (streak?"loss":"win")
                : "win",

            weeklyPoints:
              playerIndex%2===0
                ? 0
                : (streak?30:0),

            streak:
              playerIndex%2===0
                ? 0
                : 3
          },

          {
            week:4,

            hidden:
              !revealCurrent &&
              playerIndex>0,

            team:
              playerIndex%2===0
                ? "Buffalo Bills"
                : "Miami Dolphins",

            teamId:
              playerIndex%2===0
                ? "buf"
                : "mia",

            logoUrl:
              demoSurvivorLogo_(
                playerIndex%2===0
                  ? "BUF"
                  : "MIA"
              ),

            opponent:
              playerIndex%2===0
                ? "Miami Dolphins"
                : "Buffalo Bills",

            finalScore:
              isFinal
                ? (
                    playerIndex%2===0
                      ? "27-20"
                      : "20-27"
                  )
                : "",

            result:
              isFinal
                ? (
                    playerIndex%2===0
                      ? "win"
                      : "loss"
                  )
                : "pending",

            weeklyPoints:
              isFinal &&
              streak &&
              playerIndex%2===0
                ? 40
                : 0,

            streak:
              isFinal &&
              playerIndex%2===0
                ? 4
                : 3
          }
        ]
      };
    });

    const currentRound={
      week:4,
      round:4,
      name:"Week 4",

      nominees:nominees,

      canPick:
        !(isLive||isFinal||isLocked),

      requiredSelections:1,

      pickNomineeId:selectedId,
      pickNomineeIds:selectedId?[selectedId]:[],

      outcome:isFinal?"win":"pending",

      status:
        isFinal
          ? "survived"
          : isLive
            ? "pending"
            : isLocked
              ? "picked"
              : "open",

      earnedPoints:
        isFinal&&streak
          ? 40
          : 0,

      winStreak:
        isFinal&&streak
          ? 4
          : (streak?3:0),

      lossesUsed:streak?1:0,
      livesRemaining:streak?1:2,

      lockDateTime:kickoff
    };

    return {
      success:true,
      demo:true,

      sportsMode:true,

      mode:
        streak
          ? "streak-points-strikes"
          : "sports-survivor",

      gameName:
        streak
          ? "NFL Streak Survivor · Demo"
          : "NFL Survivor · Demo",

      alive:true,
      winner:false,

      currentRound:currentRound,

      rounds:rounds,
      history:usedTeamTrail,
      usedTeamTrail:usedTeamTrail,

      standings:standings,
      compare:compare,

      leagueContext:{
        leagueId:"visual-studio-demo",

        leagues:[
          {
            leagueId:"visual-studio-demo",
            leagueName:"Visual Studio Demo League"
          },
          {
            leagueId:"visual-studio-demo-2",
            leagueName:"Demo League 2"
          }
        ]
      },

      livesRemaining:streak?1:2,
      lossesUsed:streak?1:0,
      lossesAllowed:2,

      roundsSurvived:3,

      totalPoints:streak?30:0,
      bestStreak:3,

      strikeLimit:3,

      liveScoreboardClockPeriod:
        isLive
          ? {
              periodLabel:"Q3",
              clock:"7:42"
            }
          : {}
    };
  }

  function demoKothFixture_(){
    const mode=String(state.demoState||"in-progress");

    const isFinal=mode==="final";
    const isEmpty=mode==="empty";

    const strikes=
      isEmpty
        ? 0
        : isFinal
          ? 2
          : 1;

    const currentWeek=isEmpty?1:4;

    const standings=[
      {
        username:"demo-alex",
        displayName:"Alex · Demo",
        survivorAlive:true,
        kothStrikes:0,
        kothStrikeLimit:3,
        kothSeasonAverage:128.4,
        total:512.6,
        latestScore:134.2,
        rank:1
      },

      {
        username:"demo-joel",
        displayName:"Joel · Demo",
        survivorAlive:true,
        kothStrikes:strikes,
        kothStrikeLimit:3,
        kothSeasonAverage:121.7,
        total:486.8,
        latestScore:126.8,
        rank:2,
        isCurrentUser:true,
        currentUser:true
      },

      {
        username:"demo-casey",
        displayName:"Casey · Demo",
        survivorAlive:true,
        kothStrikes:2,
        kothStrikeLimit:3,
        kothSeasonAverage:118.3,
        total:473.2,
        latestScore:111.4,
        rank:5
      },

      {
        username:"demo-riley",
        displayName:"Riley · Demo",
        survivorAlive:false,
        kothStrikes:3,
        kothStrikeLimit:3,
        kothSeasonAverage:105.1,
        total:420.4,
        latestScore:96.7,
        rank:8,
        survivorEliminatedRound:3
      }
    ];

    return {
      success:true,
      demo:true,

      passiveKoth:true,
      sportsMode:true,

      mode:"king-of-the-hill",

      gameName:"King of the Hill · Demo",

      alive:true,

      currentWeek:currentWeek,
      latestWeek:isEmpty?0:4,

      latestScore:isEmpty?0:126.8,
      latestRank:2,

      actualRecipients:isEmpty?0:3,

      strikes:strikes,
      strikeLimit:3,

      sourceGameIds:[
        "demo-team-fantasy"
      ],

      sourceGames:[
        {
          gameId:"demo-team-fantasy",
          name:"Team Fantasy Weekly Score"
        }
      ],

      combineMode:"sum",
      pacingMode:"automatic",

      lockCountdown:"Sunday kickoff",

      standings:standings,

      leagueContext:{
        leagueId:"visual-studio-demo",

        leagues:[
          {
            leagueId:"visual-studio-demo",
            leagueName:"Visual Studio Demo League"
          },
          {
            leagueId:"visual-studio-demo-2",
            leagueName:"Demo League 2"
          }
        ]
      }
    };
  }

  function demoKothDashboardHtml_(payload){
    const strikes=Number(payload.strikes||0);
    const limit=Number(payload.strikeLimit||3)||3;

    const dots=
      Array.from({length:limit})
        .map(function(_,index){
          return '<i class="'+
            (index<strikes?'is-filled':'')+
            '"></i>';
        })
        .join("");

    const status=
      strikes>=limit
        ? "ELIMINATED"
        : strikes===limit-1
          ? "DANGER"
          : strikes>0
            ? "WARNING"
            : "SAFE";

    return '<section class="sports-default-koth-dashboard koth-final-dashboard">'+

      '<div class="sports-default-koth-score">'+
        '<span>YOUR KOTH SCORE</span>'+
        '<strong>'+
          html_(payload.latestScore||"—")+
          '<small> pts</small>'+
        '</strong>'+
        '<p>Team Fantasy Weekly Score</p>'+
      '</div>'+

      '<div class="sports-default-koth-strikes">'+
        '<span>STRIKES</span>'+
        '<strong>'+
          html_(strikes)+
          '<small> of '+html_(limit)+'</small>'+
        '</strong>'+
        '<div>'+dots+'</div>'+
      '</div>'+

      '<div class="sports-default-koth-status is-'+
        html_(status.toLowerCase())+
        '">'+

        '<span>STATUS</span>'+
        '<strong>'+html_(status)+'</strong>'+

        '<p>'+
          (
            status==="SAFE"
              ? "You are currently above the strike line."
              : status==="WARNING"
                ? "You have a strike. Stay above the bottom group."
                : status==="DANGER"
                  ? "One more strike can eliminate you."
                  : "Your KOTH run has ended."
          )+
        '</p>'+

      '</div>'+

    '</section>';
  }

  function demoKothCompareHtml_(payload){
    const rows=payload.standings||[];

    return '<section class="survivor-final-compare rc24k-survivor-compare koth-final-compare">'+

      '<div class="survivor-final-section-head">'+
        '<strong>COMPARE</strong>'+
        '<small>Demo players · KOTH strikes</small>'+
      '</div>'+

      '<div class="survivor-final-compare-grid">'+

        rows.map(function(row,index){
          return '<details '+
            (index===1?'open':'')+
            '>'+

            '<summary>'+

              '<span class="survivor-final-compare-player">'+
                '<strong>'+
                  html_(row.displayName||row.username)+
                '</strong>'+
              '</span>'+

              '<span>'+
                html_(
                  row.survivorAlive===false
                    ? "ELIMINATED"
                    : "ALIVE"
                )+
                ' · '+
                html_(row.kothStrikes||0)+
                '/'+
                html_(row.kothStrikeLimit||3)+
                ' STRIKES · Avg '+
                html_(
                  Number(
                    row.kothSeasonAverage||0
                  ).toFixed(1)
                )+
              '</span>'+

            '</summary>'+

            '<div>'+
              '<p>'+
                '<b>W4</b> '+
                html_(row.latestScore||"—")+
                ' pts · '+
                (index>=2
                  ? "STRIKE ZONE"
                  : "SAFE")+
              '</p>'+

              '<p>'+
                '<b>SEASON</b> '+
                html_(row.total||0)+
                ' pts · Rank #'+
                html_(row.rank||index+1)+
              '</p>'+
            '</div>'+

          '</details>';
        }).join("")+

      '</div>'+

    '</section>';
  }

  function demoSurvivorFixtureHtml_(payload){
    const kind=demoSurvivorKind_();
    const fixture=String(state.demoFixture||"full");

    if(kind==="koth"){
      const standings=
        typeof survivorStandings_==="function"
          ? survivorStandings_(payload)
          : "";

      const history=
        typeof survivorKothHistory_==="function"
          ? survivorKothHistory_(payload)
          : "";

      const compare=
        demoKothCompareHtml_(payload);

      if(fixture==="leaderboard"){
        return standings+history;
      }

      if(fixture==="compare"){
        return compare;
      }

      return (
        demoKothDashboardHtml_(payload)+
        history+
        standings+
        compare
      );
    }

    const featured=
      typeof renderSurvivorFinalFeatured_==="function"
        ? renderSurvivorFinalFeatured_(payload)
        : "";

    const browser=
      typeof renderSurvivorFinalWeeklyBrowser_==="function"
        ? renderSurvivorFinalWeeklyBrowser_(payload)
        : "";

    const trail=
      typeof renderSurvivorFinalTrail_==="function"
        ? renderSurvivorFinalTrail_(payload)
        : "";

    const standings=
      typeof survivorStandings_==="function"
        ? survivorStandings_(payload)
        : "";

    const compare=
      typeof renderSurvivorFinalLeagueCompare_==="function"
        ? renderSurvivorFinalLeagueCompare_(payload)
        : "";

    if(fixture==="leaderboard"){
      return standings+trail;
    }

    if(fixture==="compare"){
      return compare;
    }

    return (
      featured+
      browser+
      trail+
      standings+
      compare
    );
  }

  function demoSurvivorInsertHtml_(page,html){
    page
      .querySelectorAll(".pattc-vs-survivor-demo-node")
      .forEach(function(node){
        node.remove();
      });

    const template=document.createElement("template");

    template.innerHTML=
      String(html||"").trim();

    const nodes=
      Array.from(template.content.children);

    if(!nodes.length){
      return [];
    }

    const hero=
      page.querySelector(
        ".pattc-sports-hero,"+
        ".survivor-page-header,"+
        ".koth-rich-hero,"+
        ".sports-rich-hero-bg"
      );

    let anchor=hero;

    nodes.forEach(function(node){
      node.classList.add(
        "pattc-vs-demo-fixture",
        "pattc-vs-survivor-demo-node"
      );

      if(
        anchor &&
        anchor.parentNode===page
      ){
        page.insertBefore(
          node,
          anchor.nextSibling
        );
      }else{
        page.insertBefore(
          node,
          page.firstChild
        );
      }

      anchor=node;
    });

    return nodes;
  }

  function enableSurvivorDemo_(){
    const page=
      document.querySelector(".survivor-page");

    if(!page){
      return false;
    }

    demoCaptureTfGlobals_();

    const payload=
      demoSurvivorFixture_();

    const selected=
      payload.currentRound &&
      payload.currentRound.pickNomineeIds
        ? payload.currentRound.pickNomineeIds.slice()
        : [];

    try{
      window.SURVIVOR_PAGE_STATE={
        gameId:"visual-studio-demo-survivor",
        payload:payload,
        selected:selected,
        schedules:{}
      };

      window.SURVIVOR_RC24A_COMPARE_WEEK="";
    }catch(err){}

    const note=
      '<section class="card pattc-vs-demo-safety-note">'+
        '<strong>VISUAL STUDIO DEMO</strong>'+
        '<span>'+
          'Preview-only Survivor / Streak / KOTH values · '+
          'NEVER SAVED AS PLAYER DATA'+
        '</span>'+
      '</section>';

    const nodes=
      demoSurvivorInsertHtml_(
        page,
        note+
        demoSurvivorFixtureHtml_(payload)
      );

    nodes.forEach(function(node){
      demoTfDisableControls_(node);
    });

    if(
      nodes[0] &&
      nodes[0].scrollIntoView
    ){
      setTimeout(function(){
        nodes[0].scrollIntoView({
          behavior:"smooth",
          block:"start"
        });
      },20);
    }

    const kind=demoSurvivorKind_();

    setStatus_(
      (
        kind==="koth"
          ? "King of the Hill"
          : kind==="streak"
            ? "Streak Survivor"
            : "Survivor"
      )+
      " DEMO loaded with real player-page sections, scores, used teams, standings and Compare."
    );

    return true;
  }

  function demoOtherFixtureHtml_(){
    const app=document.getElementById("app");
    const identity=state.pageKey+" "+app.className+" "+app.innerHTML.slice(0,2000);
    const kind=/voting/i.test(identity)?"Voting":/ranking/i.test(identity)?"Ranking":/wager|bet-slip/i.test(identity)?"Wager":/reality/i.test(identity)?"Reality":"Awards / Picks";
    const phase=state.demoState, empty=phase==="empty", final=phase==="final", locked=final||phase==="locked";
    const names=kind==="Wager"?["Chiefs −3.5 · −110","Bills moneyline · +125","Lions / Packers over 47.5"]:
      kind==="Reality"?["Maya · immunity favorite","Jordan · at risk","Casey · safe"]:
      kind==="Awards / Picks"?["Best Picture · The Last Horizon","Lead Performance · Avery Quinn","Original Score · Northern Lights"]:
      ["Northern Lights","The Last Horizon","Wildflower"];
    let content="";
    if(kind==="Ranking" && typeof rankingPageCard_==="function"){
      const nominees=names.map(function(name,i){return {id:"demo-"+i,name:name};});
      const order=nominees.map(function(n,i){return {nomineeId:n.id,rank:i+1};});
      content=rankingPageCard_({id:"demo-ranking",name:"Predict the final order",section:"Preview ballot",points:100,locked:locked,resolved:final,earnedPoints:92,accuracyPercent:92,nominees:nominees,ballot:empty?[]:order,officialOrder:final?order:[]});
    }else if(kind==="Voting" && typeof votingPageVotingCard_==="function" && typeof votingPageResultsCard_==="function"){
      const entries=empty?[]:names.map(function(name,i){return {entryId:"demo-"+i,entryName:name,displayNumber:i+1,participantName:["Alex","Jordan","Casey"][i]};});
      const payload={settings:{votingMethod:"rank-all",instructions:"Rank the community entries",customFields:[]},entries:entries,ballot:[],ballotLimit:3,votingOpen:!locked,resultsVisible:final||phase==="live",ballotCount:empty?0:42,results:entries.map(function(e,i){return Object.assign({},e,{position:i+1,totalPoints:126-i*24,firstPlaceVotes:21-i*6,topThreeVotes:40-i*5});})};
      window.VOTING_PAGE_STATE={payload:payload,effectiveUi:"numbered",selectedEntryIds:[]};
      content=votingPageVotingCard_(payload)+votingPageResultsCard_(payload);
    }else{
      const detail=kind==="Wager" ? (empty?"No wagers placed · Balance 1,000 credits":final?"Settled · Stake 50 · Return 95.45 · Balance 1,045.45":locked?"Wager window closed · Stake 50 credits":phase==="live"?"Live · KC 21 – BUF 17 · Q3 · Stake 50":"Bet slip · Stake 50 · Potential return 95.45"):
        kind==="Reality" ? (empty?"Episode 6 · No predictions yet":final?"Episode 6 final · Maya won immunity · Jordan eliminated":locked?"Episode 6 predictions locked":phase==="live"?"Episode 6 airing · Results pending":"Episode 6 · 2 of 3 predictions selected"):
        (empty?"No picks selected · 0 of 3 complete":final?"Results final · 2 of 3 correct · 20 points":locked?"Picks locked · Results pending":phase==="live"?"Ceremony live · 1 result announced":"2 of 3 picks selected · 30 points available");
      content='<section class="card"><h2>'+html_(kind==='Wager'?'My Wagers':kind==='Reality'?'Episode Predictions':'My Picks')+'</h2><p>'+html_(detail)+'</p>'+names.map(function(name,i){return '<div class="card" style="padding:16px;margin:8px 0"><strong>'+html_(name)+'</strong><p>'+html_(empty?'Not selected':final?(i===1?'Incorrect':'Correct'):locked?'Locked':i<2?'Selected':'Available')+'</p><button disabled>'+html_(kind==='Wager'?'Preview wager':kind==='Reality'?'Preview prediction':'Preview pick')+'</button></div>';}).join('')+'</section>';
    }
    return '<div class="pattc-vs-demo-fixture"><h1>'+html_(kind)+' · '+html_(phase.toUpperCase())+'</h1>'+content+'</div>';
  }


  function render(original,options){
    state={demoState:options.phase,demoFixture:options.kind,pageKey:options.pageKey,demoSnapshots:[],demoGlobals:null};
    const clone=original.cloneNode(true);
    demoCaptureTfGlobals_();
    original.replaceWith(clone);
    try{
      if(demoTfIsPage_()) enableTeamFantasyDemo_();
      else if(demoConfidenceIsPage_()) enableConfidenceDemo_();
      else if(demoSurvivorIsPage_()) enableSurvivorDemo_();
      else clone.innerHTML=demoOtherFixtureHtml_();
      clone.querySelectorAll("script,iframe,object,embed").forEach(n=>n.remove());
      clone.querySelectorAll("*").forEach(n=>{
        Array.from(n.attributes).forEach(a=>{if(/^on/i.test(a.name))n.removeAttribute(a.name);});
        if(n.matches("button,input,select,textarea"))n.disabled=true;
        n.removeAttribute("href");n.removeAttribute("action");n.removeAttribute("formaction");
      });
      return clone.outerHTML;
    }finally{
      clone.replaceWith(original);
      demoRestoreTfGlobals_();
      state={};
    }
  }
  window.PATTC_STUDIO_R3_DEMO={render};
})(window);
