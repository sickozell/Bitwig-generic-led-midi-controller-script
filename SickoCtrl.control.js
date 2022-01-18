// *******************************************************************************************************************************
//	This script is written to be used with a generic midi controller with a certain number of led buttons assigned to midi notes
//	The best way to use it is in Bitwig ClipLauncher view, it provides management of a full live performance based on clips with several songs involved.
//
//  Controller requirements
// 	TRACK LED BUTTONS: enough led buttons according to the number of tracks every single song is.
//	SCENE LED BUTTONS: a certain number of other led buttons according to the number of scenes that is wanted to manage.
//  PLAY/PAUSE led button: 1 led button to toggle PLAY/PAUSE.
//  STOP led button: 1 led button to STOP transport.
//	NEXT/PREV SONG buttons: 2 buttons to browse the songs.
//
//	Script configuration
//	Every song is supposed to be one page of the trackBank.
//	Every page of the trackBank consists of X tracks set by "numberOfTracksPerBank" constant, so every song will consist of the same number of tracks.
//	The number of scenes in every song that is wanted to be managed is set in "numberOfScenes" constant.
// 	The MIDI channel that the script is working with, is set by "midiMessage" constant. To change the midi channel modify last digit from 0 to f
//  TRACK_BUTT array sets the midi notes of every TRACK button
//	SCENE_BUTT array sets the midi notes of every SCENE selection button
// 	PLAY_BUTTON, STOP_BUTTON, SONG_PREV and SONG_NEXT constants set the corresponding midi notes of these buttons
//
//  
//	Quick start
//
//	The script starts activating Song #1, selects Scene #1 and put itself in inSTOP state.
//	To browse songs push SONG_NEXT or SONG_PREV, script will activate only the current song channels to save CPU.
//	Select the scene in the current song with SCENE BUTTONS.
//	Toggle activation/deactivation of tracks in the current song with TRACK BUTTONS.
//	Press PLAY to queue launch the clips in the active tracks of the selected scene.
//	Press again PLAY button to PAUSE playback. The script will only queue stop the clips are curently playing, scene selected remains the same.
//	Press STOP button to queue stop all the clips are playing and re-activate all tracks.
//		At a second pression of STOP button the script will select the first scene of the current song ands top Bitwig transport.
//
//
//	Detailed instructions
//
//	First it has to be said that some choices had to be taken to avoid bitwig from start recording when there are clip slots with no content.
//	The script will act in different ways according to a global state which can be:
//
//	- inSTOP. No clips are playing.
//		STOP button LED is turned on, PLAY button LED is turned off.
//		SCENE LEDSs indicate the selected scene.
//		TRACK button LEDs indicate active tracks with clip content in the selected scene.
//
//		SONG_NEXT and SONG_PREV buttons browse the songs.
//		SCENE BUTTONS select the desired scene.
//		TRACK BUTTONS toggle activate only those tracks with content in the selected scene. If there is no clip content for that track in that scene, BUTTON WILL HAVE NO EFFECT.
//		Tracks with clips WITHOUT content are NOT automatically deactivated, so these tracks will stay active and clips will be played in other scenes if there will be content.
//		PLAY BUTTON launches the clips in the active tracks of the selected scene, and goes to inPLAY state.
//			(TRACK LEDs WILL START TO BLINK ON CLIP MIDI NOTE DETECTION)
//		STOP BUTTON selects the first scene of the current song and stop the transport of bitwig too (with a further STOP button pression bitwig will reset the transport to 0).
//
//
//	- inPLAY: Every clip in active tracks of the selected scene are playing or can be queuedPlay or can be queuedStop.
//		PLAY button LED is turned on, STOP button LED is turned off.
//		SCENE LEDs indicate the selected scene.
//		TRACK button LEDs blink on clip midi note detection.
//
//		Songs can't be browsed.
//		SCENE BUTTONS queue play the clips of active tracks of the desired scene, 
//			so it may occur that some active tracks that are not currently playing will be played because in the next scene they have clip content.
//		TRACK BUTTONS toggle activation/deactivation of the tracks and at the same time queueLaunch or queueStop the clip in the current scene,
//			if there is no clip content for that track in that scene, BUTTON WILL HAVE NO EFFECT.
//		PLAY(PAUSE in this case) BUTTON queue stops all clips that are currently playing and set the global state to inPAUSE. ACTIVE TRACKS DONT'T CHANGE. Play and stop button leds will turn on.
//		STOP BUTTON queue stops all clips that are currently playing and set the global state to inSTOP. ALL THE TRACKS ARE RE-ACTIVATED,
//			Play button led turns off, Stop button led turns on. Then track leds will indicate only the tracks with clip content.
//
//	- inPAUSE: No clips are playing, every clip in the active tracks of the selected scene will be queue launched on next PLAY button pression.
//		PLAY and STOP button LEDs are both turned on.
//		SCENE LEDs indicate the selected scene.
//		TRACK button LEDs indicate active tracks with clip content for selected scene.
//
//		Songs can't be browsed.
//		Scenes can be selected.
//		Tracks can be toggle activated.
//		PLAY BUTTON queue plays the active tracks with clip content of the selected scene and sets the global state to inPLAY
//		STOP BUTTON sets the global state goes inSTOP and re-activates all the tracks, play button led turns off, stop button led turns on.
//			Then track leds will indicate only the tracks with clip content.
//
//


loadAPI(14);

//******************************* CONTROLLER HARDWARE SETTINGS ***********************************************

const numberOfTracksPerBank = 16;						// set the numbers of tracks that constitute a "song"
const numberOfScenes = 16;								// set the number of scenes that are wanted to be managed

const midiMessage = 0x99;								// midi message to turn leds on and off, set the last digit to a value from 0 to f according to midichannel used by controller
const midiCCexclusion = "B?????";						// midi CC filtering used in hardware class to pass directly to bitwig midi CC messages coming from controller
const TOT_TRACK_BUTT = numberOfTracksPerBank;			// number of buttons used for clip selection
const TOT_SCENE_BUTT = numberOfScenes;					// number of buttons used for scene selection

var TRACK_BUTT = [36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51];		// midi notes corresponding to track toggle buttons
var SCENE_BUTT = [84, 85 ,86, 87, 88, 89, 90, 91, 92 ,93, 94, 95, 96, 97, 98, 99];		// midi notes corresponding to scene selection buttons

const PLAY_BUTTON = 52;									// midi note corresponding to toggle play/pause button
const STOP_BUTTON = 53;									// midi note corresponding to stop button
const SONG_PREV = 54;									// midi note corresponding to previous song selection, it's enabled only on inSTOP global state
const SONG_NEXT = 55;									// midi note corresponding to next song selection, it's enabled only on inSTOP global state


//***********************************  INITIALIZATION OF ARRAYS AND OTHER SCRIPT VARIABLES *******************************************

const CTRL_MIDI = initArray (-1, 128);					// array to store which button corresponds to midi note values

for (i = 0; i < TOT_TRACK_BUTT; i++)					// cycle to populate array
	CTRL_MIDI[TRACK_BUTT[i]] = i;

for (i = 0; i < TOT_SCENE_BUTT; i++)					// cycle to populate array
	CTRL_MIDI[SCENE_BUTT[i]] = i;

const inSTOP = 0;
const inPLAY = 1;
const inPAUSE = 2;
var trackCache = initArray(true, numberOfTracksPerBank);// where to store track state: TRUE active, FALSE unactive
var globalPlayingState = inSTOP;						// where to store global playinig state, iNSTOP inPLAY or inPAUSE
var currentScene = 0;									// script starts with scene 0 selected
var tempScene = 0;										// where to store temporary scene value for scene changing
const indexOfTracksPerBank = numberOfTracksPerBank-1;	// this is used only in trackHandler function to stay in the size of button midi array
const indexOfScenes = numberOfScenes-1;					// this is used only in trackhandler function to stay in the size of button midi array

function SickoCtrlHardware (outputPort, inputPort, inputCallback)
{
	this.portOut = outputPort;
	this.portIn = inputPort;
	this.noteIn = this.portIn.createNoteInput ("SickoCCs", midiCCexclusion);	// USE THIS CALLBACK TO EXCLUDE FROM SCRIPT MANAGEMENT ALL THE CCs THAT NOT COME FROM MIDI CHANNEL 10
	this.portIn.setMidiCallback (inputCallback);
	this.ledCache = initArray (-1, 128);										// comment if you don't want to use LEDCACHE. To turn off comment in Hardware prototype too
}

SickoCtrlHardware.prototype.updateLED = function (note, isOn)
{
	var value = isOn ? 127 : 0;
	
	if (this.ledCache[note] == value)					// comment if you don't want to use LEDCACHE. To turn off comment in Hardware function too
	  return;											// comment if you don't want to use LEDCACHE. To turn off comment in Hardware function too
	this.ledCache[note] = value;						// comment if you don't want to use LEDCACHE. To turn off comment in Hardware function too
	
	this.portOut.sendMidi (midiMessage, note, value);	// comment if you don't want to use LEDCACHE. To turn off comment in Hardware function too
}

function TrackHandler (trackBank, cursorTrack, sceneBank, transport)
{
	this.trackBank = trackBank;
	this.cursorTrack = cursorTrack;
	this.sceneBank = sceneBank;
	this.transport = transport;

	this.sceneBank.setIndication(true);


	for (i = 0; i < this.trackBank.getSizeOfBank(); i++)
	{
		var tempTrack = this.trackBank.getItemAt(i);
		const tempTrackIndex = i;
		tempTrack.clipLauncherSlotBank().setIndication(true);

		tempTrack.addNoteObserver(function (noteState, noteKey, noteVelocity) {  													// note observer to blink leds on clip notes
		 	noteState ? hardware.updateLED(TRACK_BUTT[tempTrackIndex], true) : hardware.updateLED(TRACK_BUTT[tempTrackIndex], false);
		});

		for (j = 0; j < tempTrack.clipLauncherSlotBank().getSizeOfBank(); j++)
		{
			const tempClip = tempTrack.clipLauncherSlotBank().getItemAt(j);
			tempClip.isPlaying().markInterested();
			tempClip.hasContent().markInterested();
			tempClip.setIndication(true);
		}

		tempTrack.clipLauncherSlotBank().addIsPlayingObserver(function (slot_index, playing) {				// Observer to turn on only existing clip leds when is all stopped or paused
			if (trackCache[tempTrackIndex] && !playing && globalPlayingState != inPLAY)
				trackHandler.trackBank.getItemAt(tempTrackIndex).clipLauncherSlotBank().getItemAt(currentScene).hasContent().get() ? hardware.updateLED(TRACK_BUTT[tempTrackIndex], true) : hardware.updateLED(TRACK_BUTT[tempTrackIndex], false);
		});
	}
	this.trackBank.followCursorTrack (this.cursorTrack);		// comment if you don't want to trackBank follow cursor track selection
}


TrackHandler.prototype.handleMidi = function (status, data1, data2)
{
	if (isNoteOn(status))
	{
		if ((data1 >= TRACK_BUTT[0])&&(data1 <= TRACK_BUTT[indexOfTracksPerBank]))		// ******************   WHEN A CLIP BUTTON IS PRESSED ***********************
		{
			var trackIndex = CTRL_MIDI[data1];
			const trackObj = this.trackBank.getItemAt(trackIndex);
			const trackClipObj = trackObj.clipLauncherSlotBank();
			const trackClipSceneObj = trackClipObj.getItemAt(currentScene);
			if (trackClipSceneObj.isPlaying().get())							// if the clip is playing
			{
				trackClipObj.stop();													// queue stops its track
				trackCache[trackIndex] = false;
				hardware.updateLED (TRACK_BUTT[trackIndex], false);
			} else {															// ELSE if the clip is not currently playing
				if (globalPlayingState == inPLAY)										// if the GLOBAL state is inPLAY
				{
					if (trackClipSceneObj.hasContent().get())								// check if clip has content
					{
						trackClipObj.launch(currentScene);										// and then launches the clip       ********************* CAMBIARE IN trackClipSceneObj.launch() ????
						trackCache[trackIndex] = true;											// updates clip cache
						hardware.updateLED (TRACK_BUTT[trackIndex], true);
					}
				} else {																// else if global state is inSTOP or inPAUSE
			    	if (trackCache[trackIndex])													// if clip cache is in playing state
			        	{
			        	if (trackClipSceneObj.hasContent().get())										// checks if clip has content
			        	{
			        		trackCache[trackIndex] = false;														// and updates clip state to NOT PLAYING state
			        		hardware.updateLED (TRACK_BUTT[trackIndex], false);
			        	}
			      	} else {																	// if else (clip is not in play state)
			        	if (trackClipSceneObj.hasContent().get())										// checks if the clip has content
			        	{
			        		trackCache[trackIndex] = true;													// updates the clip state to PLAYING state
			        		hardware.updateLED (TRACK_BUTT[trackIndex], true);								// and turns the led on
			        	}
			    	}
			    }
			}
			return true;
		} else {
			if ((data1 >= SCENE_BUTT[0])&&(data1 <= SCENE_BUTT[indexOfScenes]))	// ****************** WHEN A SCENE BUTTON IS PRESSED **********************
			{
				tempScene = CTRL_MIDI[data1];												// set the temporary variable to the desired scene
				this.sceneBank.getItemAt(tempScene).selectInEditor();						// selects the new scene in bitwig
				for (i = 0; i < numberOfTracksPerBank; i++)									// cycles all the clips in the current scene looking for those which are in PLAY state
				{
					if (trackCache[i])																// if the clip is inPLAY state
			        {
				        var tempLed = true;																	// set the corresponding led to be turned on
				        if (this.trackBank.getItemAt(i).clipLauncherSlotBank().getItemAt(tempScene).hasContent().get())	// if in the next scene the clip has content
					    {	
					    	if (globalPlayingState == inPLAY)																		// and if global playing state is inPLAY
					    		this.trackBank.getItemAt(i).clipLauncherSlotBank().launch(tempScene);										// launches the clip in the next scene
						} else {																						// otherwise (if the clip in the next scene has no content)
								this.trackBank.getItemAt(i).clipLauncherSlotBank().stop();										// queue stops track (also if global playing state was inSTOP)
								tempLed = false;																				// sets the corresponding led to be turned off
					    }
				    } else {																		// otherwise (if the clip in the previous scene was not in paying state)
				    	var tempLed = false;																// sets the corresponding led to be turned off
					}
					hardware.updateLED (TRACK_BUTT[i], tempLed);										// finally updates led light with decided settings
				}
			    setNewScene(tempScene);														//  set the new scene to desired one
			    return true;
			} else {
				tempScene = currentScene;
				switch (data1) 
			    {
					case SONG_PREV:												// ****************************** PREVIOUS BANK BUTTON *******************************************
						if (globalPlayingState == inSTOP)								// SCROLLS BANK ONLY if is inSTOP state
				        {
				        	for (i = 0; i < numberOfTracksPerBank; i++)							// cycles all tracks to queue stop them
				            {
				            	this.trackBank.getItemAt(i).clipLauncherSlotBank().stop();				// queue stops the clip
				            	this.trackBank.getItemAt(i).isActivated().set(false);					// Deactivates the old bank tracks
				          	}
				        	this.trackBank.scrollPageBackwards ();								// scroll backward of 1 bank
							this.sceneBank.getItemAt(0).selectInEditor();								// select the firs track of the bank
							setNewScene(0);														// set the new scene to 0
							for (i = 0; i < numberOfTracksPerBank; i++) 							// cycles track to start only clips with content in the scene #0 in the new bank
				            	this.trackBank.getItemAt(i).isActivated().set(true);					// activates ALL the tracks in the bank

							this.trackBank.getItemAt(0).selectInEditor();						// select the first track of bank
							this.trackBank.getItemAt(0).makeVisibleInMixer();					// let the first track be visible in mixer 
				        }
				        return true;
				    case SONG_NEXT: 											//****************************** NEXT BANK BUTTON **********************************************
						if (globalPlayingState == inSTOP) 									// SCROLLS BANK ONLY if is inSTOP state
					    {
					        for (i = 0; i < numberOfTracksPerBank; i++) 								// cycles all tracks to queue stop them
					        {
								this.trackBank.getItemAt(i).clipLauncherSlotBank().stop();					// queue stops the clip
								this.trackBank.getItemAt(i).isActivated().set(false);						// Deactivates the old bank tracks
							}
					        this.trackBank.scrollPageForwards ();									// scrolls forkward of 1 bank
					        this.sceneBank.getItemAt(0).selectInEditor();							// selects the first track of the bank

					        setNewScene(0);															// sets the new scene to 0
					        for (i = 0; i < numberOfTracksPerBank; i++) 								// cycles track to start only clips with content in the scene #0 in the new bank
								this.trackBank.getItemAt(i).isActivated().set(true);						// activates ALL the tracks in the bank

							this.trackBank.getItemAt(numberOfTracksPerBank-1).selectInEditor();		// select the last track of bank
							this.trackBank.getItemAt(numberOfTracksPerBank-1).makeVisibleInMixer();	// and let it be visible in mixer
							host.scheduleTask(function ()
							{
								trackHandler.trackBank.getItemAt(0).selectInEditor();					// after a delay of 200ms select the first track of bank
								trackHandler.trackBank.getItemAt(0).makeVisibleInMixer();				// and let it be visible in mixer
							}, 200);
						}
				        return true;
					case PLAY_BUTTON:                                              // ****************************  PLAY   BUTTON ON CONTROLLER *********************************
						switch (globalPlayingState)
						{
					        case inSTOP:													// ***** if previous state is STOP
								for (i = 0; i < numberOfTracksPerBank; i++)							// cycles tracks to queue start all the clips with contents
					            {																	// in the current scene
									if (trackCache[i] && this.trackBank.getItemAt(i).clipLauncherSlotBank().getItemAt(tempScene).hasContent().get()) 
										this.trackBank.getItemAt(i).clipLauncherSlotBank().launch(currentScene);

					            }
								hardware.updateLED (PLAY_BUTTON, true);								// turns on the play button LED
								hardware.updateLED (STOP_BUTTON, false);								// turns off the stop button LED
								globalPlayingState = inPLAY;										// set the global playing state to PLAY
								return true;
							case inPLAY:													// **** if previous state is inPLAY (as to say from PLAY to PAUSE)
								for (i = 0; i < numberOfTracksPerBank; i++)							// cycles tracks to queue stop all the clips
									this.trackBank.getItemAt(i).clipLauncherSlotBank().stop();				// stops all the clips

								hardware.updateLED (PLAY_BUTTON, true);								// turns on the play button LED
								hardware.updateLED (STOP_BUTTON, true);								// turns on the stop button LED
								globalPlayingState = inPAUSE;										// sets the global playing state inPAUSE
								return true;
					        case inPAUSE: 													// ***** if previous state is inPAUSE (as to say from PAUSE to PLAY)
								for (i = 0; i < numberOfTracksPerBank; i++)							// cycles tracks and queue play only the cached clips for playing only those with content
								{
									if (trackCache[i] && this.trackBank.getItemAt(i).clipLauncherSlotBank().getItemAt(tempScene).hasContent().get())
										this.trackBank.getItemAt(i).clipLauncherSlotBank().launch(currentScene);  

								}
								globalPlayingState = inPLAY;										// set the global playing state to PLAY
								hardware.updateLED (PLAY_BUTTON, true);								// turns on the play button LED
								hardware.updateLED (STOP_BUTTON, false);								// turns off the stop button LED
								return true;
							default:
								host.errorln("ERROR: PLAY BUTTON NOT HANDLED");
								return false;
						}
					case STOP_BUTTON: 											// ****************************  STOP BUTTON ON CONTROLLER  ************************************
						if (globalPlayingState == inSTOP)
						{
							this.sceneBank.getItemAt(0).selectInEditor();				// set the scene to 0 ONLY when STOP button is pressed for SECOND time (was already inSTOP state). 
							this.transport.stop();										// and stop transport
							setNewScene(0);												// and set scene 0 
						}
						for (i = 0; i < numberOfTracksPerBank; i++)						// cycles all the tracks in the bank to stop all the clips
						{
							this.trackBank.getItemAt(i).clipLauncherSlotBank().stop();	
							trackCache[i] = true;												// set clip cache to true for all the clips in the bank.
							this.trackBank.getItemAt(i).clipLauncherSlotBank().getItemAt(currentScene).hasContent().get() ? hardware.updateLED(TRACK_BUTT[i], true) : hardware.updateLED(TRACK_BUTT[i], false); 
						}																		//  and turns on the led only if the clip exists, otherwise turns it off
						hardware.updateLED(PLAY_BUTTON, false);							// turns off the PLAYbuttonLED
						hardware.updateLED(STOP_BUTTON, true);							// turns on the STOPbuttonLED
						globalPlayingState = inSTOP;									// set the global playing state in STOP state
						return true;
					default:
						host.errorln("THIS BUTTON IS NOT HANDLED");
						return false;
				}
			}
		}
	}
}

function InitHandler (cursorTrack, trackBank)
{
	this.cursorTrack = cursorTrack;
	this.trackBank = trackBank;
	this.cursorTrack.position().markInterested();
	this.trackBank.itemCount().markInterested();
}

function setNewScene(newScene)
{
	hardware.updateLED (SCENE_BUTT[currentScene], false);			// turns off the previous scene LED
	currentScene = newScene;										// updates the current scene
	hardware.updateLED (SCENE_BUTT[currentScene], true);			// turns on the next scene LED
}

// ************************************************** * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *  ***********************************************
// ************************************************** * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *  ***********************************************

host.setShouldFailOnDeprecatedUse(true);
host.defineController("Sickozell", "SickoCtrl", "0.1", "ad0cd427-a099-4ece-a917-2e32fe40800f", "Sickozell");
host.defineMidiPorts(1, 1);

var hardware = null;
var trackHandler = null;
var initHandler = null;

function init()
{
	hardware = new SickoCtrlHardware (host.getMidiOutPort (0), host.getMidiInPort (0), handleMidi);

	trackHandler = new TrackHandler (host.createMainTrackBank (numberOfTracksPerBank, 0, numberOfScenes),
									host.createCursorTrack ("SICK_CURSOR_TRACK", "Cursor Track", 0, numberOfTracksPerBank, true),
									host.createSceneBank(numberOfScenes),
									host.createTransport ());

	initHandler = new InitHandler (host.createCursorTrack ("INIT_CURSOR_TRACK", "Init Cursor Track", 0, 1, true),
									host.createMainTrackBank (1, 0, 1));
    
	host.scheduleTask(function() 					// ************************************** DELAYED TASK TO RESET ALL LEDS *************************************
	    {
		    host.scheduleTask(function() 							// **************** NESTED DELAYED TASK TO RESET JUST THE CLIP LEDS, OTHERWISE SCRIPT CAN'T WORK FINE
				{
				    for (i = 0; i < numberOfTracksPerBank; i++)					// cycles clip buttons to turn on those which have content
				    	trackHandler.trackBank.getItemAt(i).clipLauncherSlotBank().getItemAt(currentScene).hasContent().get() ? hardware.portOut.sendMidi (midiMessage, TRACK_BUTT[i], 127) : hardware.portOut.sendMidi (midiMessage, TRACK_BUTT[i], 0);

				    println("SickoCtrl initialized!");							// this will be the last operation during initialization
				}, 1000);												// previous function is the last that will run in init process it will run in 2 secs (1000+1000ms)

			//**************************************************************************************************************************************
			
			for (i = 0; i < numberOfScenes; i++)					// cycles all the scenes to turn on only the one is currently active (it could modified to set scene 0 turned on and others turnd off
				(i == currentScene) ? hardware.portOut.sendMidi (midiMessage, SCENE_BUTT[i], 127) : hardware.portOut.sendMidi (midiMessage, SCENE_BUTT[i], 0);

			hardware.portOut.sendMidi (midiMessage, STOP_BUTTON, 127);				// turns off other leds
			hardware.portOut.sendMidi (midiMessage, PLAY_BUTTON, 0);
			hardware.portOut.sendMidi (midiMessage, SONG_PREV, 0);
			hardware.portOut.sendMidi (midiMessage, SONG_NEXT, 0);

			//************************************************************************* next section deactivates all the tracks in all the banks except the first **********************************
			
			initHandler.cursorTrack.selectFirst();									// selects the first track of the project
			var totalNumberOfTracks = (initHandler.trackBank.itemCount().get());	// gets the total number of tracks in the project
			for (i = 0; i < totalNumberOfTracks; i++) 								// cycles all the tracks in the project
			{
				initHandler.cursorTrack.isActivated().set(false);							// deactivates tracks
				initHandler.cursorTrack.selectNext();										// scroll cursor track to the next one
			}

			initHandler.cursorTrack.selectFirst();									// selects the first track of project
			trackHandler.trackBank.scrollPageBackwards();							// this is a trick because at this point the second bank is selected (maybe it should be put in another schedule task)

			for (i = 0; i < numberOfTracksPerBank; i++)								// cycles all tracks in the first bank
			{
				trackHandler.trackBank.getItemAt(i).isActivated().set(true);				// re-activates the first bank tracks
				trackHandler.trackBank.getItemAt(i).arm().set(false);						// unarm track from recording
			}
			setNewScene(0);
		}, 1000);                                                               // this function is set to start with 1 sec DELAY

}

function handleMidi (status, data1, data2)
{
	if (trackHandler.handleMidi (status, data1, data2))
		return; 

	if (data2 != 0)
		host.errorln ("Midi command not processed: " + status + " : " + data1);
}

function flush()
{

}

function exit()
{
	println ("Exited");
}
