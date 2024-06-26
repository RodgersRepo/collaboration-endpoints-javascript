/********************************************************************/
/*                                                                  */
/* NAME: pab.js                                                     */
/*                                                                  */
/* A Javascript app to allow Cisco CE Endpoints V9.15.3.22          */
/* to access a users CUCM personal address book (PAB).              */
/*                                                                  */                                                         
/* DESCRIPTION                                                      */
/*                                                                  */
/* The user must have an ID that is a directory number (DN), and a  */
/* valid PIN. works best if you log in with your extension mobility */
/* (EM) credentials then press the PAB button on the Telepresence   */
/* endpoint. Use the same PIN to log into PAB as your EM login PIN. */
/*                                                                  */
/* NOTES                                                            */
/*                                                                  */
/* Copyright (C) 2020  GNU GPL V4 A Cripps                          */
/*                                                                  */
/* Release Date: 10/03/2020                                         */
/* Last Updated: 10/05/2024                                         */
/* Change comments:                                                 */
/*     V2 - require depreated, all new code to use import           */
/*          all xapi commands changed to new syntax                 */
/*     V2.1-Now asks for addr book user ID. A DN in this use case   */
/*     V2.2-Copy address book to favs function added                */
/*                                                                  */
/********************************************************************/

/*------------------[ Global Declarations ]-------------------------*/
import xapi from "xapi";
const extCheckFiveDigits = /^(5)[0-9]{4}$/;// Regex enforces a 5 digits user ID/Directory Number (DN) starting with 5. Change for your enviroment.
var insertXML = "<Value><Key>empty0</Key><Name>Your Address Book is Empty</Name></Value>";
var copyToFavs = "";         // variable to hold XML for the presence or not of the copy to favs button
var deleteAllFavs = "";      // variable to hold XML for the presence or not of a delete favs button
var closeOrBackWidgetId = "closeformwidget_1"; // Variable to hold widget id changes between back or close. Default is close
var closeOrBack = "Close";   // Variable to hold name of form button, Close or Back. Default is close
var pabUserExt   = "";       // Variable to hold the users extension
var pabDeviceSep = "";       // Variable to hold the device SEP device name
var pabCucmSrv   = "";       // Variable to hold the CUCM server this device registers to
var formTitle = "Personal Address Book"; 
var credUrl  = "https://";
var pabArray = [];          // Array to store  personel address list
var addEntry = {Type:"", extNum:"",nickName:""}; //Object to hold add new entry details
var urlforEdit = "";        // Variable to hold the URL that performs an edit
// Enable the HTTP client
xapi.Config.HttpClient.Mode.set('On');

//Do not check certificates with a CA server
xapi.Config.HttpClient.AllowHTTP.set('True');

//Stop user add/changeing contacts from the favorities tab
//must use the macro UI
xapi.Config.UserInterface.Phonebook.Mode.set('ReadOnly');

/*-------------------[ Functions ]----------------------------------*/

// Function that gets common attributes such as device SEP, CUCM server
// and users DN extension. Called first

async function getAttributes() {
    // Get the device SEP name
    pabDeviceSep = await xapi.Status.Network[1].Ethernet.MacAddress.get();
    pabDeviceSep = "SEP" + pabDeviceSep.replace(/:/g, '');
    console.log('Device SEP is ' + pabDeviceSep);
    
    // Get the CUCM server ip address that this device is registered to
    // if the primary [1] is down get the secondary. If any error
    // cause by getting Sip registration pop up unreg warning
    var sipProxyNum = 1;
    try {
      const sipProxyState = await xapi.Status.SIP.Proxy[sipProxyNum].Status.get();
      if (sipProxyState == 'Active'){
          pabCucmSrv = await xapi.Status.SIP.Proxy[sipProxyNum].Address.get();
      }
      else {
        sipProxyNum ++;
        pabCucmSrv = await xapi.Status.SIP.Proxy[sipProxyNum].Address.get();
      }
    }
    catch (err){
      console.log('This device is currently unregistered');
    }
    console.log('sip proxy is ' + sipProxyNum + ' ip is ' + pabCucmSrv);
    
}

function deleteFavFolders(folders) {
  // Count the number of folder IDs
  // then delete them on EM logout
  // When deleting FolderIds start at the 
  // bottom and count down as subfolders
  // get deleted when the parent gets deleted
  // Start at the top and you then try to delete a subfolder
  // that has already gone
  try {
    var count = folders.Folder.length; // Array 1st entry always 0
    var i = count - 1;
  
    for (i;  i >= 0; i--) {
      var folderId = folders.Folder[i].FolderId;
      console.log(folderId + '  deleted');
      xapi.Command.Phonebook.Folder.Delete({ FolderId: folderId });
    }
    console.log(count + ' Address book folder deleted');
  }
  catch {
    console.log('No address book folders to delete');
  }

}

// Function that handles widget responses, such as a button press

function widgetResponse(event) {
  switch(event.WidgetId) {
    case 'closeformwidget_1':
      if(event.Type == 'pressed'){
        xapi.Command.UserInterface.Extensions.Panel.Close();
      }
    break;

    case 'backformwidget_1':
      if(event.Type == 'pressed'){
        var urlToSendTo = credUrl + pabCucmSrv + ":443/ccmpd/pabSearch.do?func=search&name=" + pabDeviceSep;
        sendHttpRequest(urlToSendTo);       
      }
    break;
      
    case "logoutPABwidget_1":
      if(event.Type == 'pressed'){
        var urlToSendTo = credUrl + pabCucmSrv + ":443/ccmpd/logout.do?name=" + pabDeviceSep;
        sendHttpRequest(urlToSendTo); 
        xapi.Command.UserInterface.Extensions.Panel.Close();      
      }
    break;
    
    case 'addcontactwidget_2':
      if(event.Type == 'clicked'){
        xapi.Command.UserInterface.Message.Prompt.Display({
         Title: "Personal Address Book"
       , Text: "Select one of the following Phone number types to add"
       , FeedbackId: "pabAddFeedbackID"
       , Duration: 40
       , 'Option.1': "Home"
       , 'Option.2': "Work"
       , 'Option.3': "Mobile"});
      }
    break;
    
    case 'pabNumbers':
      if(event.Type == 'pressed' && event.Value.startsWith('https')){
        sendHttpRequest(event.Value);
      }
    break;

    case 'copyToFavsPABwidget_1':
      if(event.Type == 'pressed'){        
        copyToFavorities(insertXML);       
      }
    break;

    case 'deleteAllFavsPABwidget_1':
      if(event.Type == 'pressed'){        
        xapi.Command.Phonebook.Search({ContactType: 'Folder'}).then (deleteFavFolders);       
      }
    break;
    
    default:
    console.log("a widget was pressed but no action assigned ");
    console.log(event.WidgetId);
  }
}

// Function to copy insertXML names then numbers to favorities
// async functions create a promise to complete this action
// asynchronously. The await makes the fuction pause for the result

async function copyToFavorities(insertXmlVar) {
    if (insertXmlVar.includes("empty0")) {
      console.log("Cannot copy to favorites. Invalid or empty directory array");
      return;
    }
    var myRegex = new RegExp("pkid", "g");
    var count = (insertXmlVar.match(myRegex) || []).length;
    var i = 0;
    var localArray = []; // Array to store names/numbers

    for (i = 0;  i < count; i++) {
      var contactUrl = insertXmlVar.match("<Key>(.*?)</Key>")[1];
      var contactName = insertXmlVar.match("<Name>(.*?)</Name>")[1];
      await xapi.Command.Phonebook.Folder.Add({ Name: contactName }).then((event) => getExtForFavs(event, contactUrl))
      localArray[i] = {
        name: contactName,
        url: contactUrl
      };
      // insertXmlVar is only a string. Need to remove the 
      // line that has just been actioned so the loop can
      // find the next line
      insertXmlVar = insertXmlVar.replace("<Value><Key>" + contactUrl + "</Key><Name>" + contactName + "</Name></Value>", "");       
    }    
    return;
}

// Function that extracts the ext from URL and
// copies to correct favorites folder

function getExtForFavs(event, contactUrl) {  
  // When you rendered the on screen display
  // see line (case 'Select an index to dial':) any special characters
  // such as & had to be escaped. That escape now needs to be globally removed
  // otherwise the contactUrl is malformed!!
  contactUrl = contactUrl.replace(/&amp;/g, "&")

  // Uncomment to see the extension numbers URL and favs folder name
  //console.log(JSON.stringify(event.Name) + " " + contactUrl);
  sendHttpRequest(contactUrl, event.Name)

} 


// Function to build the XML for displaying the OSD panel

function displayDir(dirToDisplayArray) {
  if (!Array.isArray(dirToDisplayArray) || dirToDisplayArray.length === 0) {
    console.log("Invalid or empty directory array");
    return;
  }
  
  insertXML = "";
  for (var entry of dirToDisplayArray) {
    // Backticks as we are interpolating variables within the txt
    insertXML += `<Value><Key>${entry.url}</Key><Name>${entry.name}</Name></Value>`;
  }

  //Save the pab panel with the dir entries then open
  panelXML(); 
  xapi.Command.UserInterface.Extensions.Panel.Open({ PanelId: 'pabPanel_1'});
}

// Function that handles text entry and pop up warning responses from the user

function feedbackResponse(event) {
  var urlToSendTo ="";
  var addOptions = {1:"homeNumber", 2:"workNumber", 3:"mobileNumber"};
  switch(event.FeedbackId){
    case 'pabUserExtSubmit':
        // Check that the user entered a 6 digit PIN, ask again if not
        if (extCheckFiveDigits.test(event.Text)){
          pabUserExt = event.Text;
          popUpTxtInput(
            "PIN",
            "Please enter the six digit PIN for this address book",
            "Log into the Address Book with user ID " + pabUserExt,
            "Submit",
            "pabUserPinSubmit");
        }
        // Users extension not 5 digits ask again
        else {
          popUpTxtInput(
          'Numeric',
          'MUST BE 5 DIGITS AND BEGIN WITH AN 5!!, please retype',
          'Log into your Personal Address Book<br>The user ID is the same as the extension',
          'Submit',
          'pabUserExtSubmit');
        }
    break;
    case 'pabUserPinSubmit':
        urlToSendTo = credUrl 
                + pabCucmSrv 
                + ":443/ccmpd/login.do?name=" 
                + pabDeviceSep 
                + "&service=pab&pin=" 
                + event.Text 
                + "&userid="
                + pabUserExt;        
        sendHttpRequest(urlToSendTo);
    break;
    
    case 'pabAddFeedbackID':
      addEntry.Type = addOptions[event.OptionId];
      console.log("Ext Type " + addEntry.Type);
      popUpTxtInput ('SingleLine'
          , 'Please enter a Nickname here, then press Submit'
          , 'Nickname for this Contact'
          , 'Submit'
          , 'pabAddNickNameFeedbackID');
    break;
    
    case 'pabAddNickNameFeedbackID':
      addEntry.nickName = event.Text;
      popUpTxtInput ('Numeric'
          , 'Please enter a Phone number here, then press Submit'
          , 'Phone Number for this Contact'
          , 'Submit'
          , 'pabAddPhoneNoFeedbackID');
    break;
    
    case 'pabAddPhoneNoFeedbackID':
      addEntry.extNum = event.Text;
      console.log("New Contact to submit " + JSON.stringify(addEntry) );
      urlToSendTo   = credUrl
                    + pabCucmSrv 
                    + ":443/ccmpd/pabNewMain.do?name="
                    + pabDeviceSep
                    + "&n="
                    + addEntry.nickName.replace(/ /g,"+");
      sendHttpRequest(urlToSendTo);
    break;
    
    case 'pabEditFeedbackID':
      addEntry.Type = addOptions[event.OptionId];
      popUpTxtInput ('Numeric'
          , 'Please enter a Phone number here, then press Submit'
          , 'Phone number for this Contact'
          , 'Submit'
          , 'pabEditPhoneNoFeedbackID');
    break;
    
    case 'pabEditPhoneNoFeedbackID':
      // The following stops the new edit and old
      // number both being included in the edit URL
      // the if logic also filters old all undisirable
      // text
      var count = pabArray.length;
      var numbersToAdd = "";
      var pkidToEdit = JSON.stringify(pabArray);
      pkidToEdit = pkidToEdit.match("pkid=(.*?)&amp;func")[1];
      var i;
      for (i = 0; i < count; i++) {
        var existingNumber = pabArray[i].name.toLowerCase().replace(/ /g,"Number=");
        
        if (pabArray[i].name.match("(Home|Work|Mobile)")  && 
            existingNumber.split('=')[0] != addEntry.Type &&
            existingNumber.includes("Number=")) {
              
              numbersToAdd += "&" + existingNumber;
        }
      }
        
      urlforEdit       = credUrl
                       + pabCucmSrv 
                       + ":443/ccmpd/pabEditPhones.do?pkid="
                       + pkidToEdit
                       + "&name="
                       + pabDeviceSep
                       + numbersToAdd;
      
      urlToSendTo = urlforEdit + "&" + addEntry.Type + "=" + event.Text;
      sendHttpRequest(urlToSendTo);
    break;
    
    default:
    console.log("an unassigned feedback response was recieved ");
    console.log(event.FeedbackId);
  }
}

// Function to extract the PAB data and URL from the returning CUCM XML

function extractNamesFromDir(xml, whatToFind) {
  // Count the number of pab entries by their primary key
  // or pkid which is unique to that entry
  // need the or as if returns nothing get null rather than 0

var myRegex = new RegExp(whatToFind, "g");
var count = (xml.match(myRegex) || []).length;
var i;
var localArray = []; // Array to store  personel address list

for (i = 0;  i < count; i++) {
    var dirName = xml.match("<MenuItem><Name>(.*?)</Name><URL>")[1];
    var dirUrl = xml.match(dirName + "</Name><URL>(.*?)</URL>")[1];
    localArray[i] = {
        name: dirName,
        url: dirUrl
    };
    xml = xml.replace(`<MenuItem><Name>${dirName}</Name><URL>${dirUrl}</URL></MenuItem>` , "");
  }
return localArray;
}

// Function that responds to the CUCM XML. Different case executed  depending
// upon the <prompt> text returned by CUCM
// double case statements to capture lower and upper case responses

function responseToHttp(prompt, xml) {
  //console.log("the prompt text is " + prompt);  // Uncomment this to see prompt text from CUCM
  //console.log("XML from cucm is:- " + xml); // Uncomment to see xml from cucm
  var urlToSendTo = "";
  switch(prompt) {
      case 'Personal Directory Log in':
      case 'Personal Directory Login':
        // When logging in again previous data entries can show. Blank these then close the panel.
        insertXML = "<Value><Key>empty0</Key><Name></Name></Value>";
        copyToFavs = "";
        deleteAllFavs = "";
        panelXML();
        xapi.Command.UserInterface.Extensions.Panel.Close();
        console.log("You need to log in");
        // pop up a login box
        popUpTxtInput(
          "Numeric",
          "Please enter five digit user id for the address book",
          "Log into your Personal Address Book<br>The user ID is the same as the extension",
          "Submit",
          "pabUserExtSubmit");
      break;
      
      case 'Search for an entry':
        console.log("You are already logged in, download directory names");
        urlToSendTo = credUrl + pabCucmSrv + ":443/ccmpd/pabSearch.do?func=search&name=" + pabDeviceSep;
        sendHttpRequest(urlToSendTo);
      break;
      
      case 'Page 1 of 1':
        console.log("Display directory names");
        pabArray = extractNamesFromDir(xml, "pkid");
        closeOrBack = "Close";
        closeOrBackWidgetId = "closeformwidget_1";
        copyToFavs = "<Widget><WidgetId>copyToFavsPABwidget_1</WidgetId><Name>Copy this address book to favorites folder</Name><Type>Button</Type><Options>size=4</Options></Widget>";
        deleteAllFavs = "<Widget><WidgetId>deleteAllFavsPABwidget_1</WidgetId><Name>Delete all entries from the favorities folder</Name><Type>Button</Type><Options>size=4</Options></Widget>";
        displayDir(pabArray);
      break;
      
      case 'No entries':
      case 'No Entries':
        console.log("No directory names found, open an empty panel");
        insertXML = "<Value><Key>empty0</Key><Name>Your Address Book is Empty</Name></Value>";
        closeOrBack = "Close";
        copyToFavs = "";
        deleteAllFavs = "";
        panelXML();
        xapi.Command.UserInterface.Extensions.Panel.Open({ PanelId: 'pabPanel_1'});
      break;
      
      case 'Select an index to dial':
        console.log("User to select contacts number to dial");
        var pkidToDeleteEdit = xml.match("pkid=(.*?)&amp;func")[1];
        pabArray = extractNamesFromDir(xml, "fdNumber");
        // Need HTML entity for & i.e &amp; or XML will not render
        var urlforDelete = credUrl
                         + pabCucmSrv 
                         + ":443/ccmpd/pabDeleteEntry.do?pkid="
                         + pkidToDeleteEdit
                         + "&amp;func=delete&amp;name="
                         + pabDeviceSep;
        var urlforPabEdit= credUrl
                         + pabCucmSrv 
                         + ":443/ccmpd/pabEditMain.do?pkid="
                         + pkidToDeleteEdit
                         + "&amp;func=phones&amp;name="
                         + pabDeviceSep;
        // Unicode for thick line ALT 2015, thin line 2500
        pabArray.push({name: '───────────────────', url: 'EMPTY'});
        pabArray.push({name: 'Delete This Contact', url: urlforDelete});
        pabArray.push({name: 'Edit This Contact', url: urlforPabEdit});
        copyToFavs = "";
        deleteAllFavs = "";
        closeOrBack = "Back";
        closeOrBackWidgetId ="backformwidget_1";
        displayDir(pabArray);
      break;
      
      case 'Edit Phone Numbers':
      case 'Edit phone numbers':
        xapi.Command.UserInterface.Message.Prompt.Display({
          Title: "Personal Address Book"
        , Text: "Select one of the following Phone number types to add or edit"
        , FeedbackId: "pabEditFeedbackID"
        , Duration: 40
        , 'Option.1': "Home"
        , 'Option.2': "Work"
        , 'Option.3': "Mobile"});
      break;
      
      case 'OK to dial...':
      case 'OK to Dial...':        
        var numToDial = xml.match("<URL>Dial:(.*?)</URL>")[1];
        if (numToDial){
          console.log('Dialing the number ' + numToDial);
          xapi.Command.Dial({Number: numToDial});
          xapi.Command.UserInterface.Extensions.Panel.Close();
          console.log("Dialing chosen number");
        }
      break;
      
      case 'Successful remove':
      case 'Successful Remove':
        xapi.Command.UserInterface.Extensions.Panel.Close();
        var completionMsg = xml.match("<Text>(.*?)</Text>")[1];
        popUpWarning(completionMsg, "pabEntryRemoved");
      break;
      
      case 'PD Error Message':
        var errorMsg = xml.match("<Text>(.*?)</Text>")[1];
        popUpWarning(errorMsg, "pabEntryError");
      break;
      
      case 'Enter phone numbers':
      case 'Enter Phone Numbers':
        var urlToSend = credUrl
                    + pabCucmSrv 
                    + ":443/ccmpd/pabNewPhones.do?name="
                    + pabDeviceSep
                    + "&n="
                    + addEntry.nickName.replace(/ /g,"+")
                    + "&"
                    + addEntry.Type
                    + "="
                    + addEntry.extNum;
      //console.log(urlToSend);
      sendHttpRequest(urlToSend);
      break;
      
      case 'Successful add':
      case 'Successful Add':
      case 'Successful modify':
      case 'Successful Modify':
        xapi.Command.UserInterface.Extensions.Panel.Close();
        var completionMsg = xml.match("<Text>(.*?)</Text>")[1];
        popUpWarning(completionMsg, "pabAddDoneOK");
      break;
      
    default:
      // You cant put contains method after a case statement. So
      // have put it here with an If statement to capture all 
      // creation of favorite folders

      if (prompt.startsWith("localGroupId-")){
        pabArray = extractNamesFromDir(xml, "fdNumber");
        for (var entry of pabArray) {
          var extensionToUse = entry.name.replace(/^\D+/g, "");
          // If there is an extension number add it to the folder in the prompt
          if (extensionToUse){
            xapi.Command.Phonebook.Contact.Add({ 
            FolderId: prompt, 
            Name: entry.name, 
            Number: extensionToUse
            });
          }
        }
      }
      console.log("No changes to make");
  }
}

// Function that sends an HTTPs Get request to CUCM

function sendHttpRequest(url, favsArg = null) {
  xapi.Command.HttpClient.Get({ 
    Header: ["Content-Type: text/xml"], 
    Url: url,
    AllowInsecureHTTPS: 'True',
    ResultBody: 'plaintext'
  })
  .then((result) => {
      var x = result.Body;
      //console.log("URL used to conatc CUCM:- " + url + " Result from CUCM:- " + x);  // Uncomment to see XML data recieved from CUCM
      var promptTxt = x.match("<Prompt>(.*)</Prompt>")[1];
      if (favsArg){promptTxt = favsArg}
      responseToHttp(promptTxt, x);
  })
  .catch((err) => {
   console.log("HTTP request failed: " + JSON.stringify(err));
   xapi.Command.UserInterface.Extensions.Panel.Close();
   popUpWarning('A Network Error has occured, contact your system administrator', "pabHttpsError");
  });
}

// Function that draws the GUI form panel to the screen 
function panelXML() {
  // Backticks when including variables inline
  xapi.Command.UserInterface.Extensions.Panel.Save(
  { PanelId: 'pabPanel_1' },
  `
  <Extensions>
  <Version>1.6</Version>
  <Panel>
    <PanelId>pabPanel_1</PanelId>
    <Type>Statusbar</Type>
    <Icon>Language</Icon>
    <Order>1</Order>
    <Color>#00D6A2</Color>
    <Name>PAB</Name>
    <ActivityType>Custom</ActivityType>
    <Page>
      <Name>${formTitle}</Name>
      <Row>
        <Name>Row1</Name>
        <Widget>
          <WidgetId>addcontactwidget_2</WidgetId>
          <Name>Add Contact</Name>
          <Type>Button</Type>
          <Options>size=2</Options>
        </Widget>
        <Widget>
          <WidgetId>${closeOrBackWidgetId}</WidgetId>
          <Name>${closeOrBack}</Name>
          <Type>Button</Type>
          <Options>size=2</Options>
        </Widget>
        ${copyToFavs}
        ${deleteAllFavs}
        <Widget>
          <WidgetId>logoutPABwidget_1</WidgetId>
          <Name>Log out of this address book</Name>
          <Type>Button</Type>
          <Options>size=4</Options>
        </Widget>
      </Row>
      <Row>
        <Name>Row2</Name>
        <Widget>
          <WidgetId>pabNumbers</WidgetId>
          <Type>GroupButton</Type>
          <Options>size=3;columns=1</Options>
          <ValueSpace>
            ${insertXML}
          </ValueSpace>
        </Widget>
      </Row>
      <Options>hideRowNames=1</Options>
    </Page>
  </Panel>
</Extensions>
`);
}

// popUpTxtInput displys a GUI, contents of the GUI change depending
// upon what input is required from the user
// i.e User PIN

function popUpTxtInput (kboardType, placeholderText, textInputTxt, buttonTxt, pabTxtInputFeedbackID){

  xapi.Command.UserInterface.Message.TextInput.Display({
               InputType: kboardType
             , Placeholder: placeholderText 
             , Title: "Personal Address Book"
             , Text: textInputTxt
             , SubmitText: buttonTxt 
             , FeedbackId: pabTxtInputFeedbackID
  });

}

function popUpWarning(textMessage, pabWarningFeedbackID) {
  
    xapi.Command.UserInterface.Message.Prompt.Display({
         Title: "Personal Address Book"
       , Text: textMessage
       , FeedbackId: pabWarningFeedbackID
       , Duration: 40
       , 'Option.1': "OK"
});  

}

/*-------------------[ Main Execution ]------------------------------*/
// On first boot or reset
// Call function that resolves users atributes i.e. CUCM srv, extension
// the SEP number of the device
getAttributes();

// Call getAttributes if there is a change in EM login
// for example someone has logged in or out
// GET RID OF THI AS NOW ASKING FOR EXT??
xapi.Status.SIP.Registration[1].URI.on(getAttributes);
        
// Saves the pab button to the screen
// not needed is using the securece macro as this
// will place the button on the screen
//panelXML(); 

// Normally when a button is pressed the coresponding panel opens
// need to check if user already logged into PAB. Panel is closed and
// replaced by a check on log in status function

xapi.Event.UserInterface.Extensions.Panel.Clicked.on((event) => {
    if(event.PanelId == 'pabPanel_1'){
        getAttributes();
        var closeOrBackWidgetId = "closeformwidget_1"; 
        var closeOrBack = "Close";
        var urlToSendTo = credUrl + pabCucmSrv + ":443/ccmpd/pabSearch.do?func=search&name=" + pabDeviceSep;
        sendHttpRequest(urlToSendTo);
    }
});

// Listeners for Text Input, Message Prompt and Widget (form button presses)
// responses form user

xapi.Event.UserInterface.Message.TextInput.Response.on(feedbackResponse);

xapi.Event.UserInterface.Message.Prompt.Response.on(feedbackResponse);

xapi.Event.UserInterface.Extensions.Widget.Action.on(widgetResponse);
