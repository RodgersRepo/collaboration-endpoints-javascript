# javascript
Javascript macros for Cisco Telepresence Endpoints
## Macros
##### pab.js - A Javascript macro to allow Cisco CE Endpoints (V9.15.3.22) to access a users CUCM personal address book (PAB). Works best with CUCM extension mobility (EM), log into EM then press the PAB button on the Telepresence endpoint touch screen. To use.
- Browse to your endpoint.
- Navigate to __UI Extentions Editor__.
- Click the menu icon (top right, three vertical lines).
- Click __Import from file__.
- Select the file __PABroomcontrolcomfig.xml__.<br><br>This will place a button labeled PAB on your telepresence enpoint. Now upload the javascript macro.
- Browse to your endpoint.
- Navigate to __Macro Editor__.
- Click __Import from file__.
- Once uploaded toggle the macro on/off to __on__.
- Read the comments at the start of __pab.js__ and throughout the macro. Change to suit your enviroment.<br><br>
To use. Press the PAB button on the endpoint. Provide your log in PIN. The screen clears, press the PAB button again. Your CUCM personal address book entries should display.
## Links
#### [Cisco RoomOS Macro Examples](https://roomos.cisco.com/macros)
Where to go to find out more about Javascript Macros on Cisco endpoints.
