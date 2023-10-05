# Cisco CE endpoints javascript macros

A collection of Javascript macros for Cisco Telepresence Endpoints registered to CUCM.

### Macros
**pab.js** - A Javascript macro to allow Cisco CE Endpoints (V9.15.3.22) to access a users CUCM personal address book (PAB). Works best with CUCM extension mobility (EM), log into EM then press the PAB button on the Telepresence endpoint touch screen.

![Figure 1 - Personal Address Book Log In](/./PABLoginScreenShot.png "Personal Address Book Log In")
![Figure 2 - Personal address book names detail](/./PABListSmall.png "Personal address book names detail")

-------------------------------------

**pinchange.js** - A Javascript macro for Cisco CE Endpoints (V9.15.3.22). Allows a CUCM end user to change their extension mobilty pin. Designed around a CUCM implementation that uses directory numbers. This is a bit of a work in progress, be sure to change the code to match your enviroment. The comments should help with this. I have tried to make the macro respond to CUCM account "locked", and "account requires a pin change" but as you will see, the implementation is a little clumsy. This is due to the same error event, on the endpoint, being thrown for both "locked" and "pin change required".

![Figure 3 - Pin change log In](/./PinChangeScreenShot.png "Pin change log in")

## Installation

Click on the link for the javascript/xml above. When the code page appears click the **Download Raw file** button top right. Once downloaded to your computer have a read of the code in your prefered editor. Read the comments at the start of each code page and throughout the code. Change to suit your enviroment.

## Usage

Browse to your endpoint from the same computer you downloaded the XML and JavaScript onto. Then follow the instuctions below for each macro name.

__pab.js__ - Download the javascript and XML code as above
- Navigate to __UI Extentions Editor__. On the enpoint.
- Click the menu icon (top right, three vertical lines).
- Click __Import from file__.
- Select the file __PABroomcontrolconfig.xml__.<br><br>This will place a button labeled PAB on your telepresence endpoint. Now upload the javascript macro.
- Browse to your endpoint.
- Navigate to __Macro Editor__.
- Click __Import from file__.
- Once uploaded toggle the macro on/off to __on__.
- Read the comments at the start of __pab.js__ and throughout the macro. Change to suit your enviroment.<br><br>
To use. Press the PAB button on the endpoint. Provide your log in PIN. The screen clears, press the PAB button again. Your CUCM personal address book entries should display.

__pinchange.js__ - Use the same instructions to load onto your endpoint as __pab.js__ except use the files __pinchange.js__ and __PINCHANGEroomcontrolconfig.xml__.

## Credits and references

#### [Cisco RoomOS Macro Examples](https://roomos.cisco.com/macros)
Where to go to find out more about Javascript Macros on Cisco endpoints.

----
