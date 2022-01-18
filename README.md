# Bitwig-generic-led-midi-controller-script
Bitwig script for song management in live performances, with scene selection and toggle launch/stop clips

This script is written to be used with a generic midi controller with a certain number of led buttons assigned to midi notes.
It will manage song browsing with activation of the channels of the selected song, scene browsing, toggle launch/stop clips.

The best way to use it is in Bitwig ClipLauncher view, it provides management of a full live performance based on clips with several songs involved.

Controller requirements
  TRACK LED BUTTONS: enough led buttons according to the number of tracks every single song is.
  SCENE LED BUTTONS: a certain number of other led buttons according to the number of scenes that is wanted to manage.
	PLAY/PAUSE led button: 1 led button to toggle PLAY/PAUSE.
	STOP led button: 1 led button to STOP transport.
	NEXT/PREV SONG buttons: 2 buttons to browse the songs.

Script configuration
	Every song is supposed to be one page of the trackBank.
	Every page of the trackBank consists of X tracks set by "numberOfTracksPerBank" constant, so every song will consist of the same number of tracks.
	The number of scenes in every song that is wanted to be managed is set in "numberOfScenes" constant.
 	The MIDI channel that the script is working with, is set by "midiMessage" constant. To change the midi channel modify last digit from 0 to f
	TRACK_BUTT array sets the midi notes of every TRACK button
	SCENE_BUTT array sets the midi notes of every SCENE selection button
 	PLAY_BUTTON, STOP_BUTTON, SONG_PREV and SONG_NEXT constants set the corresponding midi notes of these buttons

  
Quick start

	The script starts activating Song #1, selects Scene #1 and put itself in inSTOP state.
	To browse songs push SONG_NEXT or SONG_PREV, script will activate only the current song channels to save CPU.
	Select the scene in the current song with SCENE BUTTONS.
	Toggle activation/deactivation of tracks in the current song with TRACK BUTTONS.
	Press PLAY to queue launch the clips in the active tracks of the selected scene.
	Press again PLAY button to PAUSE playback. The script will only queue stop the clips are curently playing, scene selected remains the same.
	Press STOP button to queue stop all the clips are playing and re-activate all tracks.
		At a second pression of STOP button the script will select the first scene of the current song ands top Bitwig transport.


Detailed instructions

	First it has to be said that some choices had to be taken to avoid bitwig from start recording when there are clip slots with no content.
	The script will act in different ways according to a global state which can be:

	- inSTOP. No clips are playing.
		  STOP button LED is turned on, PLAY button LED is turned off.
		  SCENE LEDSs indicate the selected scene.
		  TRACK button LEDs indicate active tracks with clip content in the selected scene.

		  SONG_NEXT and SONG_PREV buttons browse the songs.
		  SCENE BUTTONS select the desired scene.
		  TRACK BUTTONS toggle activate only those tracks with content in the selected scene. If there is no clip content for that track in that scene, BUTTON WILL HAVE NO EFFECT.
		  Tracks with clips WITHOUT content are NOT automatically deactivated, so these tracks will stay active and clips will be played in other scenes if there will be content.
		  PLAY BUTTON launches the clips in the active tracks of the selected scene, and goes to inPLAY state.
			    (TRACK LEDs WILL START TO BLINK ON CLIP MIDI NOTE DETECTION).
		  STOP BUTTON selects the first scene of the current song and stop the transport of bitwig too (with a further STOP button pression bitwig will reset the transport to 0).


	- inPLAY: Every clip in active tracks of the selected scene are playing or can be queuedPlay or can be queuedStop.
		  PLAY button LED is turned on, STOP button LED is turned off.
		  SCENE LEDs indicate the selected scene.
		  TRACK button LEDs blink on clip midi note detection.

		  Songs can't be browsed.
		  SCENE BUTTONS queue play the clips of active tracks of the desired scene, 
			  so it may occur that some active tracks that are not currently playing will be played because in the next scene they have clip content.
		  TRACK BUTTONS toggle activation/deactivation of the tracks and at the same time queueLaunch or queueStop the clip in the current scene,
			    if there is no clip content for that track in that scene, BUTTON WILL HAVE NO EFFECT.
		  PLAY(PAUSE in this case) BUTTON queue stops all clips that are currently playing and set the global state to inPAUSE,
          ACTIVE TRACKS DONT'T CHANGE. Play and stop button leds will turn on.
		  STOP BUTTON queue stops all clips that are currently playing and set the global state to inSTOP. ALL THE TRACKS ARE RE-ACTIVATED,
			  Play button led turns off, Stop button led turns on. Then track leds will indicate only the tracks with clip content.

	- inPAUSE: No clips are playing, every clip in the active tracks of the selected scene will be queue launched on next PLAY button pression.
  		PLAY and STOP button LEDs are both turned on.
	  	SCENE LEDs indicate the selected scene.
		  TRACK button LEDs indicate active tracks with clip content for selected scene.

		  Songs can't be browsed.
		  Scenes can be selected.
		  Tracks can be toggle activated.
		  PLAY BUTTON queue plays the active tracks with clip content of the selected scene and sets the global state to inPLAY
		  STOP BUTTON sets the global state goes inSTOP and re-activates all the tracks, play button led turns off, stop button led turns on,
    			then track leds will indicate only the tracks with clip content.
