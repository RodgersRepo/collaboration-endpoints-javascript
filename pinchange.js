/****************************************************************************/
/*                                                                          */
/* NAME:pinchange.js                                                        */
/*                                                                          */
/* A javascript app for Cisco CE devices that changes a users Extension     */
/* mobility (EM) PIN                                                        */
/*                                                                          */
/*                                                                          */
/*                                                                          */
/* NOTES                                                                    */
/*                                                                          */
/* Copyright (C) 2019 GNU GPL V3 RodgeIndustries2000                       */
/*                                                                          */
/* Release Date:Version 1 16/06/2019                                        */
/* Last Updated: V1.1 23/01/2020                                            */
/*               V2.0 17/04/2023                                            */
/* Change Comments: V1.1                                                    */
/*                  Clear the default EM display when forced to change PIN  */
/*                  commented this out as not compatable with room/desk     */
/*                  V2.0                                                    */
/*                  Remove depreated 'require'. Update Cisco xapi syntax    */
/*                                                                          */
/****************************************************************************/

/*---------------------[Declarations]---------------------------------------*/
import xapi from "xapi";
const pinCheckSixDigits  = /^[0-9]{6}$/;   // Regex to check PINs are 6 digits
const extCheckFiveDigits = /^[0-9]{5}$/;// Regex to check user ext DN is 5 digits
//Change to match digit lengths in your enviroment

var userExt   = ""; // Variable to hold the users extension
var deviceSep = ""; // Variable to hold the device SEP device name
var cucmSrv   = ""; // Variable to hold the CUCM server this device registers to
                            
var userCurrentPin = ""; // Variable to hold users old PIN
var userNewPin     = ""; // Variable to hold users new PIN
var userConfirmPin = ""; // Variable to hold user PIN confirmation

var lastPromptText = ""; // Variable to hold a txt message can be used to 
                         // customise message prompt display
                         
// Enable the HTTP client
xapi.Config.HttpClient.Mode.set('On');

//Do not check certificates change for Production enviroment!!
xapi.Config.HttpClient.AllowHTTP.set('True');

/*-----------------------[Functions]----------------------------------------*/

// Function that gets common attributes such as device SEP and CUCM server

async function getAttributes() {
    // Get this devices SEP name
    deviceSep = await xapi.Status.Network[1].Ethernet.MacAddress.get();
    deviceSep = "SEP" + deviceSep.replace(/:/g, '');
    console.log('Device SEP is ' + deviceSep);
    
    // Get the CUCM server ip address that this device is registered to
    // if the primary [1] is down get the secondary. If any error
    // cause by getting Sip registration pop up unreg warning
    var sipProxyNum = 1;
    try {
      const sipProxyState = await xapi.Status.SIP.Proxy[sipProxyNum].Status.get();
      if (sipProxyState == 'Active'){
          cucmSrv = await xapi.Status.SIP.Proxy[sipProxyNum].Address.get();
      }
      else {
        sipProxyNum ++;
        cucmSrv = await xapi.Status.SIP.Proxy[sipProxyNum].Address.get();
      }
    }
    catch (err){
      popUpWarning('This device is unregistered, contact the service desk');
    }
    console.log('sip proxy is ' + sipProxyNum + ' ip is ' + cucmSrv);
}

// Function actioned when a GUI needs to be displayed for user input

function displayPinGui(kboardType, placeHolderTxt, textInputTxt, buttonTxt, uniqueFeedbackId){
  // Did the user type their ext in? change mesage accoringly
  
  xapi.Command.UserInterface.Message.TextInput.Display({
    InputType: kboardType,
    KeyboardState: 'Open',
    Placeholder: placeHolderTxt,
    Title: 'Set PIN',
    Text: textInputTxt,
    SubmitText: buttonTxt,
    FeedbackId: uniqueFeedbackId
  })
}

// Function that pops up a warning box

function popUpWarning(textMessage) {

  xapi.Command.UserInterface.Message.Prompt.Display({
         Title: "Set PIN"
       , Text: textMessage
       , 'Option.1': "OK"

});
}

// Function actioned when a response is required from the displayPinGui function

function changePinResponse(event){
  // How to respond to each type of PIN set GUI event
  switch(event.FeedbackId){
    // What to do if the event is the users extension
    case 'userExtension':
      // Check that the user entered a 6 digit PIN, ask again if not
      if (extCheckFiveDigits.test(event.Text)){
        userExt = event.Text
        // Users Extension has 5 digits (change for your enviroment) so ask them for their  PIN
        displayPinGui('PIN', 'Type your current PIN here ..', 'Enter Your Current PIN', 'Next', 'userPin');
        }
      // Users extension not 5 digits ask again
      else {
        displayPinGui(
        'Numeric',
        'Must be 5 digits!!, please retype extension ..',
        'Enter Your Extension',
        'Next',
        'userExtension');
      }
    break;
    
    // What to do if the event is the users PIN
    case 'userPin':
      // Check that the user entered a 6 digit PIN, ask again if not
      if (pinCheckSixDigits.test(event.Text)){
        userCurrentPin = event.Text;
        // Users PIN has 6 digits so ask them for their new PIN
        displayPinGui('PIN', 'Type your new PIN here ..', 'Enter Your New PIN', 'Next', 'userNewPin');
        }
      // Users PIN not 6 digits ask again
      else {
        displayPinGui(
        'PIN',
        'PINs must be 6 digits !!, please retype your current PIN ..',
        'Enter Your current PIN',
        'Next',
        'userPin');
      }
    break;
    
    // What to do if the event is the users new PIN
    case 'userNewPin':
      // Check that the user entered a 6 digit new PIN, ask again if not
      if (pinCheckSixDigits.test(event.Text)){
        userNewPin = event.Text;
        // Users PIN has 6 digits so ask them for their new PIN
        displayPinGui('PIN', 'Confirm your new PIN here ..', 'Confirm Your New PIN', 'Submit', 'userConfirmPin');
        }
      // New PIN is not 6 digits, ask again
      else {
        displayPinGui(
        'PIN',
        'PINs must be 6 digits !!, please retype your new PIN ..',
        'Enter Your New PIN',
        'Next',
        'userNewPin');
      }
    break;
    
    // What to do if the event is the users new PIN
    case 'userConfirmPin':
      // Check that the user entered a 6 digit confirmed PIN, ask again if not
      if (pinCheckSixDigits.test(event.Text)){
        userConfirmPin = event.Text;
        // Users confirmed PIN has 6 digits so post the PIN change to CUCM
        sendToCucm(cucmSrv, 'Get', '');// No payload data as this is a get request
        }
      // Users confirmed PIN does not have 6 didgits, ask them again
      else {
        displayPinGui(
        'PIN',
        'PINs must be 6 digits !!, please reconfirm new PIN ..',
        'Confirm Your New PIN',
        'Submit',
        'userConfirmPin');
      }
    break;
      
  }
}

// Function called when the PIN change values are ready to send to CUCM
function sendToCucm(url){
  // Remember, get requests have a blank data variable
  var responseTxt = "";// Empty variable to store transaction txt result
  
  // Pop up message alert telling using PIN change has been sent
  popUpWarning('Your PIN set request has been sent');
  
  let credUrl = "https://" + url + ":443/changecredential/ChangeCredentialServlet?" +
            "changePin=true&device=" + deviceSep +
            "&userid=" + userExt +
            "&oldpin=" + userCurrentPin +
            "&newpin=" + userNewPin +
            "&confirmnewpin=" + userConfirmPin;
  
  xapi.Command.HttpClient.Get({
    Header: "Content-Type: application/json",
    Url: credUrl,
    AllowInsecureHTTPS: 'True',
    ResultBody: 'PlainText',
    Timeout: '10'
    
  }).then((result) => {
    responseTxt = JSON.stringify(result);
    //console.log("HTTPs sent successfully:" + responseTxt ); // Uncomment to see CUCM responce text
    // Prepare the response text to display to the user
    // for example pass/fail
  
    if ( responseTxt.includes("PIN change is complete")){
      responseTxt = "PIN change successful. Please log in in the normal way.";}

    else if (responseTxt.includes("<Prompt>Contact system administrator</Prompt>")){
      responseTxt = responseTxt = "Looks like your account is LOCKED. Please contact your system administrator";}
  
    else if (responseTxt.includes("<Title>Change Credential</Title>")){
      var startOfTxt = responseTxt.search("<Prompt>");
      var endOfTxt = responseTxt.search("</Prompt>");
      responseTxt = responseTxt.substring(startOfTxt + 8, endOfTxt);}    
      
    else { responseTxt = "Error. Connection timed out"; }
    
    popUpWarning(responseTxt);
    
  }).catch((err) => {
    responseTxt = JSON.stringify(err);
    console.log("HTTPs request failed:" + responseTxt );
    
    // Pop up an error message as PIN set failed
    
    popUpWarning('Network timeout. Check your network connection');    
  });
  
}

// Function to kick off changing your PIN 
function changePinNextLogin(event) {
    getAttributes();
    if(event.Success === 'False' && event.ResponseCode === 'UnspecifiedError')
    {   // PIN change triggered by ExtensionMobility event

        displayPinGui(
        'Numeric',
        'Type you extension here',
        'Either your account is LOCKED or your PIN needs to be changed. lets try changing your PIN first. Enter Your Extension',
        'Next',
        'userExtension');
    }
    else if (event.PanelId == 'change_pin')
    {
        // PIN change triggered by button press
        
        // Clear the EM default page shown behind the changepin txt box
        // only works for DX and SX !!
        // Have commented out as not working on Room and Desk
        // devices, throws an error
        //xapi.Command.UserInterface.OSD.Key.Click({ Key: 'C' });
        
        displayPinGui(
        'Numeric',
        'Type you extension here',
        'Please provide your extension mobility directory number extension',
        'Next',
        'userExtension');
    }
}
    
/*---------------------[Main Execution]-------------------------------------*/
// On first boot or reset get attributes such as device SEP
// CUCM address and users DN
getAttributes();

// Listen for events from the PIN set GUI, call changePinResponse function
// when an event detected
xapi.Event.UserInterface.Message.TextInput.Response.on(changePinResponse);
    
// Listen for the PIN set button press, execute function if pressed
xapi.Event.UserInterface.Extensions.Panel.Clicked.on(changePinNextLogin);

// Listen for Extension mobility event that detects the user needs 
// to change their PIN. Execute function to change PIN if triggered
// WARNING. Endpoint ExtensionMobility events cannot cannot distinguish 
// between a locked extension mobility PIN and a PIN that requires changing 
// CUCM policy. 
xapi.Event.ExtensionMobility.on(changePinNextLogin);

// Listen for a user logging in, get there attributes
// not interested in the event just the change
xapi.Status.SIP.Registration[1].URI.on(getAttributes);