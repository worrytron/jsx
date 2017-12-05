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

1.0.3 - 12/15/2017
===================================================================================================
- Added show & sponsor logo sheet switching
- Improved OSX support (for ESPN devices)
- Changed all internal path mapping to relative
- Option to convert scripted AE template to standalone version (e.g. for edit toolkits)

1.0.4 - before xmas
===================================================================================================
* Thoroughly test & extend C4D support for 3D assets
* More render output templates (720p, 1080p, separate matte&fill, etc)
* Remove requirement for render output templates to be built by user
* User-selected render folder option

1.1.0 - early 2018
===================================================================================================
* Batching from spreadsheet
* Text layout templates incorporated into ESPNTools UI
* Conform update tools incorproated into ESPNTools UI