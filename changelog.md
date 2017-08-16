1.0.1 - 8/11/2017
===================================================================================================
- Home team logosheet precomp was linked to away team .ai file. Fixed & deployed immediately
- Removed call to restore active comp from autoTraceAll() -- was causing issues in eval()
- Re-enabled clickAutoTrace.exe when using autoTraceLayer()

1.0.2 - 8/15/2017
===================================================================================================
- Overhauled batching functions
- Added getTeamsByCategory() method to ProductionData
- Added 'strict' flag to changedProject(). When false, this will squelch errors flagging invalid
  project names. It is only used when the "Use Existing" checkbox is changed.
- Added redundancy check to changedTeam functions to ensure that they only run when the team 
  actually changes.
- Batching functions now use the set*Menu() commands instead of calling subroutines individually.

1.1.0 - DEVELOPMENT BRANCH
===================================================================================================
* Add V: drive rendering as an option
* Batching from spreadsheet option
* Text layout tools (?)