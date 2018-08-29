/**
 * Module Description
 * 
 * Version        Date          Author         Remarks
 * 2.00    September 16 2014    Srinadh
 *
 */

var SUITELET_ID = '427';     	// Suitelet Name : Gap 7 - Genesys SSU Journal Approvals     
                           		// Suitelet ID : customscript_ssu_journal_approval

var SAVED_SEARCH_ID = '1183'; 	// Saved Search Name : JEs Pending My Approval
								// Saved Search ID : customsearch1183

// This is the IDs of the JE Approval Status List 
var STATUS_SUBMIT = '1';
var STATUS_REJECTED = '2';
var STATUS_PENDING = '3';
var STATUS_APPROVED = '4';
var STATUS_WAITING = '5';

// This is the internal ID of the Netherlands Subsidiary
var NETHERLANDS = '108';

// These are codes used for the creation of the emails
var OPEN_PARA = '<p>';
var CLOSE_PARA = '</p>';
var LINE_BREAK = '<br>';
var SPACE = '&nbsp;';
var SUBJECT = 'Journal Entry # is waiting for your approval';

// Standard error message related to not finding any approvers in the JE Matrix
var NO_APPROVERS = "We couldn't find the appropriate approvers for this transaction.";
var PROBLEM_LOADING_RECORDS = "There was a problem comparing the new record to the old one. \n\nPlease contact your administrator";
var NO_RIGHTS_TO_POST = "The user creating this Journal Entry does not have the appropriate rights to do so.";
var ESCALATED_APPROVAL = "This JE has been escalated as there were multiple specific routing account rules linked to it.";

// URLs of Netsuite, using the appropriate one when needed.
// var NS_PROD_URL = 'https://system.na2.netsuite.com';
// var NS_SBX_URL = 'https://system.sandbox.netsuite.com';
// var NS_SS_JE_TO_BE_APPROVED = "/app/common/search/searchresults.nl?searchid="+SAVED_SEARCH_ID;
var NS_PROD_URL = 'https://system.na2.netsuite.com';
var NS_SBX_URL = 'https://system.sandbox.netsuite.com';
var NS_SS_JE_TO_BE_APPROVED = "/app/common/search/searchresults.nl?compid=3544291&searchid="+SAVED_SEARCH_ID;

var COMPID = "&compid=3544291";

// System user
var SYSTEM_USER_ID = '-4';  //ID returned by nlapiGetUserId() when system user present.
var SYSTEM = '991';   //Internal ID of the system user

// Added by Nabil Boutaleb - 3/10/2014 Added IT_ALERTS group
var IT_ALERTS = '86532'; // Internal ID of the IT_ALERTS group

//Admin Role as Global Variable
var ADMINISTRATOR_ROLE_ID = 3;

//replacement for CEO and CFO as approvers
var CFO = ["9882"];
var CEO = ["9876"];
var CFO_CEO_Replacement = ["22146"];

////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Server side scripts
////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Description:  
 * 1)	Determines if the script is allowed: JE NOT from rev rec, voiding, amortization, allocation, system
 *      If script is not allowed, auto approve and hide save for later checkbox
 *      If the script is allowed:
 * 2)   on create or copy initialize values
 * 3)   on view, if JE is not approved, Hide Standard Approve button
 *                sets the script, which makes the function: buttonPress() available
 *			      display appropriate buttons
 * 4)   if type is not create AND not copy (view or edit) hide the save for later checkbox
 */
function userEventBeforeLoad_JEApprovals(type, form, request)
{
	var logTitle='userEventBeforeLoad_JEApprovals';
	nlapiLogExecution('debug',logTitle,'----BEGIN----');
	nlapiLogExecution('debug',logTitle,'entry on type: '+type);
	nlapiLogExecution('debug',logTitle,'record type: '+nlapiGetRecordType()+', record id: '+nlapiGetRecordId());
	var allowScript = isScriptAllowed();
	nlapiLogExecution('debug',logTitle,'allowScript: '+allowScript);
	if (allowScript)
	{
		if (type == 'create' || type == 'copy')
		{
			nlapiSetFieldValue('custbody_script_status', STATUS_SUBMIT);
			nlapiSetFieldValue('approved','F');
			nlapiSetFieldValue('custbody_genesys_approved_date','');
			nlapiSetFieldValue('custbody_genesys_journal_memo_optional','');
			nlapiSetFieldValue('custbody_genesys_je_approvedby','');
			if (nlapiGetUser() != SYSTEM_USER_ID) nlapiSetFieldValue('custbody_genesys_created_by',nlapiGetUser());
			else nlapiSetFieldValue('custbody_genesys_created_by',SYSTEM); 
			nlapiSetFieldValue('custbody_save_for_later','F');
		}
		if (type == 'view') 
		{
		    var je_status = nlapiGetFieldValue('approved');
		    if(je_status == 'F')
		    {
	             var approveButton = form.getButton('approve');
                     if(approveButton != '' && approveButton != null)
                     {
                     approveButton.setLabel('Do Not Use');
                    }
		    }
		    
			var jeRecord = nlapiLoadRecord(nlapiGetRecordType(), nlapiGetRecordId());
			nlapiLogExecution('debug',logTitle,'approved: '+nlapiGetFieldValue('approved')+', Approval Status: '+nlapiGetFieldValue('custbody_script_status'));
			
			form.setScript('customscript_genesys_cue_journal_approva');
			
			var scriptStatus = nlapiGetFieldValue('custbody_script_status');
			switch (scriptStatus)
			{
			case STATUS_SUBMIT:
			case STATUS_WAITING:
			case STATUS_REJECTED:
				form.addButton('custpage_submit_je_button', 'Submit JE', "buttonPress('submit')");
				break;
			case STATUS_PENDING:
				if (nlapiGetFieldValue('approved')=='F')
				{
					showButtons(form,jeRecord); //shows approve and reject buttons if user is an approver
				}
				break;
			case STATUS_APPROVED:
				break;
			default:
				// This is an unsupported script Status.
				nlapiLogExecution('ERROR', logTitle, "Status is unsupported : " + scriptStatus);
			break;
			}
		}
		if (type != 'create' && type !='copy'){
			var saveForLaterField = nlapiGetField('custbody_save_for_later');
			if(!isEmpty(saveForLaterField)) saveForLaterField.setDisplayType('hidden');
		}
	} 
	else
	{
		if (type=='view' && nlapiGetFieldValue('approved')=='F')
		{
			nlapiLogExecution('DEBUG', logTitle,'Type is create, will add approved.');
			/*var today = new Date();
			nlapiSetFieldValue('approved','T');
			nlapiSetFieldValue('custbody_script_status',STATUS_APPROVED);
			nlapiSetFieldValue('custbody_genesys_je_approvedby',SYSTEM);
			nlapiSetFieldValue('custbody_auto_approved_je','T');
			nlapiSetFieldValue('custbody_genesys_approved_date', nlapiDateToString(today) + ' ' + nlapiDateToString(today, 'timeofday'));*/
			var fields = ['custbody_genesys_approved_date','custbody_script_status','approved','custbody_genesys_je_approvedby','custbody_auto_approved_je'];
            var values = [nlapiDateToString(new Date()) + ' ' + nlapiDateToString(new Date(), 'timeofday'),STATUS_APPROVED,'T',SYSTEM,'T'];
            nlapiSubmitField(nlapiGetRecordType(), nlapiGetRecordId(), fields, values);	
		    nlapiLogExecution('debug',logTitle,'allow script is false, therefore auto-approved JE.');
		}
		var saveLaterField = nlapiGetField('custbody_save_for_later');
		if (!isEmpty(saveLaterField))
		{
			saveLaterField.setDisplayType('hidden');
		}
	}
	nlapiLogExecution('debug',logTitle,'----END----');
}

/**
 * Description:  
 * 1)	Determines if the script is allowed: JE NOT from rev rec, voiding, amortization, allocation, system
 *      If the script is NOT allowed, auto-approve the JE
 *      If the script is allowed:
 * 2)   on edit OR create (not from suitelet): 
 * 		if status is submit: submit JE for approval: will run decision process to determine approvers and place them in Approvals tab 
 * 		if status is pending or approved:  will determine if there were important changes, if so will re-route the JE for approval
 */
function userEventAfterSubmit_JEApprovals(type)
{
	var logTitle = 'userEventAfterSubmit_JEApprovals';
	nlapiLogExecution('debug',logTitle,'----BEGIN----');
	nlapiLogExecution('debug',logTitle,'entry on type: '+type);
	nlapiLogExecution('debug',logTitle,'record type: '+nlapiGetRecordType()+', record id: '+nlapiGetRecordId());
	
	var allowScript = isScriptAllowed();
	nlapiLogExecution('debug',logTitle,'allowScript: '+allowScript);    
	if (allowScript)
	{
		var executionContext = nlapiGetContext().getExecutionContext();	
		// I ignore xedit, which means that any "nlapiSubmitField" will not trigger this code.
		if ((type == 'edit' || type == 'create') && executionContext != 'suitelet' && executionContext != 'scheduled') 
		{ //executionContext != 'suitelet': To prevent the execution of the after submit when nlapiSubmitField is called from suitelet on non xeditable fields.
	      //executionContext != 'scheduled': To prevent concur APAC JE's created by scheduled script triggering this function
			var oldRecord = nlapiGetOldRecord();
			var newRecord = nlapiGetNewRecord();
			var jeRecord = nlapiLoadRecord(nlapiGetRecordType(), nlapiGetRecordId());
			// we use the afterEvent to change states
			var scriptStatus = nlapiGetFieldValue('custbody_script_status');
			switch (scriptStatus)
			{
			case STATUS_SUBMIT:
				submitForApproval(jeRecord);  //Initial submit on create of the JE
				break;
			case STATUS_PENDING:
			case STATUS_APPROVED:
				reRouteIfImportantChanges(oldRecord,newRecord,jeRecord);
				break;
			case STATUS_REJECTED:
			case STATUS_WAITING:
				break;
			default: // This is an unsupported script Status.  In this case, auto-approve.
				nlapiLogExecution('ERROR',logTitle, "Status is unsupported : " + scriptStatus);
			break;
			}
		}
	} 
	else if (nlapiGetFieldValue('approved')=='F' && type != 'delete')
	{   
	    var fields = ['custbody_genesys_approved_date','custbody_script_status','approved','custbody_genesys_je_approvedby'];
        var values = [nlapiDateToString(new Date()) + ' ' + nlapiDateToString(new Date(), 'timeofday'),STATUS_APPROVED,'T',SYSTEM];
        nlapiSubmitField(nlapiGetRecordType(), nlapiGetRecordId(), fields, values);	
		nlapiLogExecution('debug',logTitle,'allow script is false, therefore auto-approved JE.');
	}
	nlapiLogExecution('debug',logTitle,'----END----');
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Suitelets
////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Description:  Performs the actions when Approve JE OR Submit JE OR Reject JE buttons are pressed.
 *               Submit JE: Initial submit of the JE
 *               Approve JE: Approved by Admin or Approvers(revenue/non-revenue,tax)
 *               Reject JE: Rejects JE and its reversal if present, requests reason for rejection
 */
function buttonPressResponse(request, response)
{   
    try
    {
	var logTitle = 'buttonPressResponse';
	nlapiLogExecution('debug',logTitle,'-----BEGIN-----');
	if ( request.getMethod() == 'GET' )
	{
		var jeId = request.getParameter('jeId');
		var button = request.getParameter('button');
		var recordType = request.getParameter('type');
		var user_approved = request.getParameter('user');
		nlapiLogExecution('debug',logTitle,'user_approved: '+user_approved);
		var user_role = request.getParameter('role');
		nlapiLogExecution('debug',logTitle,'user role: '+user_role);
		var jeRecord = nlapiLoadRecord(recordType, jeId);
		nlapiLogExecution('debug',logTitle,'record type: '+recordType+', record id: '+jeId);
		nlapiLogExecution('debug',logTitle,'button type: '+button);
		switch (button) 
		{
		case 'submit':
			submitForApproval(jeRecord);
			break;
		case 'jeapproval':
		    if(user_role == ADMINISTRATOR_ROLE_ID)
		    {
		    nlapiLogExecution('debug',logTitle,'Approving JE as user is admin');
			approveJEActions(jeRecord,user_approved);
			break;
			}
		    else
			{
		    var filters = new Array();
		    filters[0] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
    	    filters[1] = new nlobjSearchFilter('custrecord_je_number', null, 'is', jeRecord.getId());
		    filters[2] = new nlobjSearchFilter('custrecord_approved_by_approver', null, 'is', 'F');
		    var find_record = nlapiSearchRecord('customrecord_je_approvers', null, filters, null);
	        if(!isEmpty(find_record))
			{
		    for ( var p = 0; p < find_record.length; p++) 
		    {
		    var cr_id = find_record[p].getId();
    	    var record = nlapiLoadRecord('customrecord_je_approvers', cr_id);	
		    var pri = record.getFieldValue('custrecord_je_primary_approver_record');
		    var sec = record.getFieldValue('custrecord_je_secondary_approvers_record');
		    if(pri == user_approved || sec == user_approved)
		    {
		    record.setFieldValue('custrecord_approved_by_approver', 'T');
		    nlapiSubmitRecord(record);
		    }
		    }
		    }
		    var filters1 = new Array();
		    filters1[0] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
    	    filters1[1] = new nlobjSearchFilter('custrecord_je_number', null, 'is', jeRecord.getId());
		    filters1[2] = new nlobjSearchFilter('custrecord_approved_by_approver', null, 'is', 'F');
		    var find_records = nlapiSearchRecord('customrecord_je_approvers', null, filters1, null);
	        if(isEmpty(find_records))
		    {
		    nlapiLogExecution('debug',logTitle,'Approving JE as all users approved');
			approveJEActions(jeRecord,user_approved);
			break;
			}
		    if(!isEmpty(find_records))
		    {
		    nlapiLogExecution('debug',logTitle,'not all approvers approved');
		    jeRecord.setFieldValue('custbody_script_status', STATUS_PENDING);
		    jeRecord.setFieldValue('approved', 'F');
		    nlapiSubmitRecord(jeRecord);
		    break;
		    }
		    }
		case 'reject':
		    nlapiLogExecution('debug',logTitle,'entered reject case');
			nlapiSubmitField(recordType, jeId, 'custbody_script_status', STATUS_REJECTED);
			var reason = request.getParameter('reason');
			sendRejectedEmail(jeRecord, reason);
			//if a reversal is linked to the JE, reject it.
			var isReversal =  nlapiLookupField(recordType,jeId,'isreversal');
			if(isReversal == 'F')
			{
				var reversalNumber = nlapiLookupField(recordType,jeId,'reversalnumber');
				if(!isEmpty(reversalNumber))
				{
				var reversalJErecord = getReversalRecord(reversalNumber);
			    nlapiLogExecution('debug',logTitle,'rejecting the reversal JE.');
			    nlapiSubmitField(recordType,reversalJErecord,'custbody_script_status',STATUS_REJECTED);
			    nlapiLogExecution('debug',logTitle,'Rejected Reversal JE with Id: '+reversalJErecord);
				}
			} 
			break;
		default:
			nlapiLogExecution('ERROR',logTitle, "button is unsupported : " + button);
			break;
		}
		response.sendRedirect('RECORD', jeRecord.getRecordType(), jeId, false);
	}
	nlapiLogExecution('debug',logTitle,'-----END-----');
	}
	catch(err)
	{
		if (err.name == 'RCRD_HAS_BEEN_CHANGED')
		{
			nlapiLogExecution('error',logTitle, err.name + ', ' + err.message);
		}
        else 
		{
			throw err;
		}
	} //the error is RCRD_HAS_BEEN_CHANGED, which does not need to be handled.
}



/**
 * Description: This function finds the value of the fields 'Approved To Post JE' and 'User Name' on 
 * employee records and returns these value via suitelet
 */
function suitelet_getEmployeeApprovedToPostJEInfo(request, response) 
{
	var logTitle = 'suitelet_getEmployeeApprovedToPostJEInfo';
	nlapiLogExecution('debug',logTitle,'-----BEGIN-----');
	if (request.getMethod() == 'GET') 
	{
		// null check on the required parameter
		if (request.getParameter('employeeID') != null) 
		{
			var employeeSearchResult = searchEmployees(request.getParameter('employeeID'));
			if (employeeSearchResult != null && employeeSearchResult != '') 
			{
				var isApprovedToPost = employeeSearchResult[0].getValue('custentity_approved_post');
				var userName = employeeSearchResult[0].getValue('entityid');
				var JsonEmployeeInfo = {"isApprovedToPost" : isApprovedToPost,"userName" : userName};
				var JsonEmployeeInfoString = JSON.stringify(JsonEmployeeInfo);
				response.write(JsonEmployeeInfoString);
			}
			else response.write('');
		}
	}
	nlapiLogExecution('debug',logTitle,'-----END-----');
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Client Side Scripts
////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Description:  This function is triggered when user presses one of the custom buttons.
 * This will call the suitelet with function 'buttonPressResponse' and passes required parameters in a URL
 */
function buttonPress(button)
{
	var logTitle='buttonPress';
	var context = nlapiGetContext().getEnvironment();
    var url = '';
	// URL will change depending on the environment.
    if (context == 'SANDBOX') 
	{
    	url = NS_SBX_URL;
    } 
	else if (context == 'PRODUCTION')
	{
    	url = NS_PROD_URL;
    }
    url +=  '/app/site/hosting/scriptlet.nl?script='+SUITELET_ID+'&deploy=1&button='+button+'&jeId='+nlapiGetRecordId()+'&type='+nlapiGetRecordType()+'&user='+nlapiGetUser()+'&role='+nlapiGetRole();
	// If we reject, we need to put in a reason. 
	if (button == 'reject')
	{
		var reason = prompt('Why?');
		if (reason != null)
		{
			url += '&reason=' + reason ;
			window.open(url,'_parent');
		}
	} 
	else 
	{ //added by Nabil B. 2013-12-21
		window.open(url,'_parent');
	}
}

/**
 * Description:  This is the function that initializes values. Mostly built to correct "make copy" situations.
 * The client side is done as well as the server side to make sure that the values in the UI 
 * are the same as the values on the server.
 */
function pageInit_initializeValues(type)
{
	var logTitle = 'pageInit_initializeValues';
	nlapiLogExecution('debug',logTitle,'----BEGIN----');
	nlapiSetFieldValue('custbody_genesys_created_by',nlapiGetUser()); 
	var allowScript = isScriptAllowed()
	nlapiLogExecution('debug',logTitle,'allowScript: '+allowScript);       
	if (allowScript)
	{
		if (type == 'create' || type == 'copy')
		{
			// On Create or copy , we initialize values
			nlapiSetFieldValue('custbody_script_status', STATUS_SUBMIT);
			nlapiSetFieldValue('approved','F');
			nlapiSetFieldValue('custbody_genesys_journal_memo_optional','');
			nlapiSetFieldValue('custbody_genesys_approved_date','');
			nlapiSetFieldValue('custbody_genesys_je_approvedby','');
			nlapiSetFieldValue('custbody_genesys_created_by',nlapiGetUser());
			nlapiSetFieldValue('custbody_save_for_later','F');	
		}
	} 
	else 
	{
		var today = new Date();
		nlapiSetFieldValue('approved','T');
		nlapiSetFieldValue('custbody_script_status',STATUS_APPROVED);
		nlapiSetFieldValue('custbody_genesys_je_approvedby',SYSTEM);
		nlapiSetFieldValue('custbody_genesys_approved_date', nlapiDateToString(today) + ' ' + nlapiDateToString(today, 'timeofday'));
	}
	nlapiLogExecution('debug',logTitle,'----END----');
}

/**
 * Description: This function verifies that the current user is part of the Approved to Post
 * list. If so, the user can save a JE, if not an alert message informs the user
 * they are not part of the list an email is sent to the Administrator
 * indicating this user has attempted to save a JE and the JE cannot be saved.
 */
function clientSaveRecord_userIsApprovedToPost()
{
	var logTitle = 'clientSaveRecord_userIsApprovedToPost';
	nlapiLogExecution('debug',logTitle,'-----BEGIN-----');
	var scriptAllowed = isScriptAllowed();                                     
    nlapiLogExecution('debug',logTitle,'scriptAllowed: '+scriptAllowed);       
    if (scriptAllowed) 
	{                                                        
		var userID = nlapiGetUser();
		var userRole = nlapiGetContext().getRoleId();
		var employeeInfoJsonString = GetEmployeeInfo(userID);
		if (employeeInfoJsonString == '' || employeeInfoJsonString == null) 
		{
			var err = nlapiCreateError(
					'Unexpected Error',
					'The value of Is Approved To Post JE cannot be found.  Please contact your NetSuite administrator.');
			throw err;
		} 
		else 
		{
			var employeeInfoJson = JSON.parse(employeeInfoJsonString);
			var isApprovedToPost = employeeInfoJson.isApprovedToPost;
			var userName = employeeInfoJson.userName;
			if (isApprovedToPost != 'T' && userRole != 'administrator') 
			{
				alert('You do not have the permission to enter Journal Entries.');
				var body = 'Hello,\n\nThe user '
						+ userName
						+ ' has attempted to enter a Journal Entry.  Please contact this user.\n\nYour NetSuite Administrator';
				nlapiSendEmail(SYSTEM, 'netsuite.access@genesys.com',
						'Access to posting Journal Entries', body, null, null,
						null, null);

				return false;
			} 
			else return true;
		}
	}
	else return true;
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Scheduled Scripts
////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Description: Scheduled script that sends email to JE approvers with JE's that have been pending approval
 * for more than 24 hours.  The email contains a link to a saved search that lists all JE's pending
 * approval 
 */
function scheduled_sendApprovalEmails(type)
{
	var logTitle='scheduled_sendApprovalEmails';
	var approverListSearchResult = searchPendingApprovalJEApprovers();
	//Build the list of unique approver
	var approverArray = [];
	for (var i=0; !isEmpty(approverListSearchResult) && i < approverListSearchResult.length; i++)
	{
		var dateSubmittedToApprovalString = approverListSearchResult[i].getValue('created',null,'group');
		var dateSubmittedToApproval = nlapiStringToDate(dateSubmittedToApprovalString);
		var dateBeginningToday = new Date();
		dateBeginningToday.setHours(0);
		dateBeginningToday.setMinutes(0);
		dateBeginningToday.setSeconds(0);
		
		if(dateSubmittedToApproval < dateBeginningToday)
		{
			var primaryApprover = approverListSearchResult[i].getValue('custrecord_je_primary_approver_record',null,'group');
			var secondaryApproversString = approverListSearchResult[i].getValue('custrecord_je_secondary_approvers_record',null,'group');
			var secondaryApprovers = secondaryApproversString.split(',');
		    approverArray.push(primaryApprover);
			if(secondaryApprovers != null && secondaryApprovers != '')
			{
			for (var j=0; j < secondaryApprovers.length; j++)
			{	
				approverArray.push(secondaryApprovers[j]);
			}
			}
			else{
			var jeIntID = approverListSearchResult[i].getValue('internalid',null,'group');
			nlapiLogExecution('Debug',logTitle, 'No Seconday Approvers present for JE with Internal ID' +jeIntID);
			}
		}
	}
	var uniqueApproverArray = getUniqueValues(approverArray);
	for ( var k = 0; k < uniqueApproverArray.length; k++) 
	{
		if (uniqueApproverArray[k]==CFO_CEO_Replacement || uniqueApproverArray[k]==CEO || uniqueApproverArray[k]==CFO)
		{
			uniqueApproverArray.splice(k, 1);
		}
	}
	//send email to each unique approver containing link to search results that contain JE to be approved for this approver
	for (var j=0; j < uniqueApproverArray.length; j++)
	{
		// Added by Nabil Boutaleb - 3/10/2014 : Added a try catch with send email
		try 
		{
			// Try to catch errors related to that sending of emails.
			if (!isEmpty(uniqueApproverArray[j])) 
			{
				sendEmailWithJEsToBeApproved(uniqueApproverArray[j]);				
			}
		} 
		catch(e)
		{
			nlapiLogExecution('error',logTitle, 'email failed');
			nlapiLogExecution('error',logTitle, 'approver : ' + approver );
			var body = 'Emails failed to be sent. They were related to one of these JEs : \n\n';
			for ( var int = 0; int < approverListSearchResult.length; int++) 
			{
				nlapiLogExecution('error',logTitle, 'je number possibly related to error : ' + approverListSearchResult[int].getValue('custrecord_je_number',null,'max'));
				body += approverListSearchResult[int].getValue('custrecord_je_number',null,'max') + '\n';
			}
			body += '\nHere is the error message : \n\n' + e.name + '\n\n' + e.message;
			sendGroupEmail(SYSTEM, IT_ALERTS, 'Journal Reminder Approval Failed', body);
			nlapiSendEmail(SYSTEM, nlapiGetUser(), 'Journal Reminder Approval Failed', body);
		}
	}
}

/**
 * Description:  Scheduled script that sets the system JEs created from : Rev Rec, to approved.
 * Metering governance has not been taken in consideration, so this solution needs to
 * be monitored.  The UI saved search: 'System JEs search'  allows to see how many records
 * this script will process
 */
function scheduled_setSystemJEsToApproved(type) 
{
	var logTitle = 'scheduled_setSystemJEsToApproved';
	nlapiLogExecution('debug',logTitle,'----BEGIN----');
	var systemJEsSearchResult = searchSystemJEs(); // 10 units
	var numberOfSysJEsToApprove = 0;
	if (!isEmpty(systemJEsSearchResult)) 
	{
		numberOfSysJEsToApprove = systemJEsSearchResult.length;
	}
	nlapiLogExecution('debug',logTitle,'Number of system JEs to approve: '+numberOfSysJEsToApprove);
	for ( var i = 0; !isEmpty(systemJEsSearchResult) && i < systemJEsSearchResult.length; i++) 
	{
		var journalInternalID = systemJEsSearchResult[i].getValue('internalid',null, 'group');
		try 
		{
				// Added more fields - Nabil Boutaleb 1/10/2014
				var fields = ['custbody_genesys_approved_date','custbody_script_status','approved','custbody_genesys_je_approvedby'];
				var values = [nlapiDateToString(new Date()) + ' ' + nlapiDateToString(new Date(), 'timeofday'),STATUS_APPROVED,'T',SYSTEM];
				nlapiSubmitField('journalentry', journalInternalID, fields, values);	
				nlapiLogExecution('debug',logTitle,'The journal with Id: '+journalInternalID+' has been approved.');
		}			
		// 30 units
		catch(err)
		{
			if (err.name == 'UNEXPECTED_ERROR') 
			{
				nlapiLogExecution('error',logTitle,'error name: ' + err.name + ' JE ID: '+ journalInternalID);
			} 
			else if (err.name != 'RCRD_HAS_BEEN_CHANGED')
			{
				nlapiLogExecution('error',logTitle, err.name + ', ' + err.message);
			} 
			else 
			{
				throw err;
			}
		} //the error is RCRD_HAS_BEEN_CHANGED, which does not need to be handled.
	}
	nlapiLogExecution('debug',logTitle,'----END----');
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////
//General Functions
////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Description:  Shows approve and reject buttons if user is an approver (or if user is an administrator)
 */
function showButtons(form,jeRecord)                
{
	var logTitle = 'showButtons';
	var approvers = getJEApprovers(jeRecord);
	var userRole = nlapiGetContext().getRoleId();
    // For each of the available approvers, if user id is an approver, show Approve button and add Reject button.
    if (userRole =='administrator')
	{
    	form.addButton('custpage_approve_je_button', 'Approve JE', "buttonPress('jeapproval')");
    	form.addButton('custpage_reject_je_button', 'Reject', "buttonPress('reject')");
    } 
	else 
	{
    	for ( var i = 0; i < approvers.list.length; i++)
		{
    		if (nlapiGetUser() == approvers.list[i])
			{
    			form.addButton('custpage_approve_je_button', 'Approve JE', "buttonPress('jeapproval')");
    			form.addButton('custpage_reject_je_button', 'Reject', "buttonPress('reject')");
    		}
    	}
    }
}

/**
 * Description:  Set the approval fields (approval status, approved by, date approved) on the JE.  If it's a standard JE
 *               also set 'approved' to 'T' : this has the effect of approving the reversal JE if it exists.
 *               For the reversal do not set 'approved' to 'T' because this creates an unexpected script error.
 */
function approveJEActions(jeRecord,user_approved)
{
	var logTitle = 'approveJEActions';
	var recordType = jeRecord.getRecordType();
	var recordId = jeRecord.getId();
	var jeApprover = nlapiGetUser();
	var jeApproverRole = nlapiGetRole();
	var jeCreator = jeRecord.getFieldValue('custbody_genesys_created_by');
	/*var postperiod = jeRecord.getFieldValue('postingperiod');
	nlapiLogExecution('debug','posting period Internal id',postperiod);
	if(jeApproverRole != 1185 && jeApproverRole != 3)
	{
	var check_validation = isPeriodAllowedForPosting(postperiod);
	nlapiLogExecution('debug','check_validation',check_validation);
	if(check_validation == false)
	{
		var postperiod1 = postingperiod();
		var postperiod = getAccoutingPeriodNetsuiteId('accountingperiod', postperiod1);
	}
	}*/
	var isReversal =  nlapiLookupField(recordType,recordId,'isreversal');
	//If the current JE is a reversal JE (case manual approval of reversal).  Approve it and do nothing else.
	//Else, approve the standard JE, search for a linked reversal JE, if there is one, approve it.
	if(isReversal == 'T')
	{
		nlapiLogExecution('debug',logTitle,'approving the reversal JE.');
		//var fields = ['custbody_script_status','custbody_genesys_je_approvedby','custbody_genesys_approved_date','postingperiod'];
		var fields = ['custbody_script_status','custbody_genesys_je_approvedby','custbody_genesys_approved_date'];
		var today = new Date();
		//var values = [STATUS_APPROVED, user_approved, nlapiDateToString(today) + ' ' + nlapiDateToString(today, 'timeofday'), postperiod];
		var values = [STATUS_APPROVED, user_approved, nlapiDateToString(today) + ' ' + nlapiDateToString(today, 'timeofday')];
		nlapiSubmitField(recordType,recordId,fields,values);
		nlapiLogExecution('debug',logTitle,'Approved Reversal JE with type: '+recordType+' and Id: '+recordId);
	}
	else
	{
		nlapiLogExecution('debug',logTitle,'approving the standard JE.');
		//It is necessary to set approved to true on standard JE for the reversal to get approved.
		//var fields = ['custbody_script_status','custbody_genesys_je_approvedby','custbody_genesys_approved_date','approved','postingperiod'];
		var fields = ['custbody_script_status','custbody_genesys_je_approvedby','custbody_genesys_approved_date','approved'];
		var today = new Date();
		//var values = [STATUS_APPROVED,user_approved,nlapiDateToString(today) + ' ' + nlapiDateToString(today, 'timeofday'),'T',postperiod];
		var values = [STATUS_APPROVED,user_approved,nlapiDateToString(today) + ' ' + nlapiDateToString(today, 'timeofday'),'T'];
		nlapiSubmitField(recordType,recordId,fields,values);
		nlapiLogExecution('debug',logTitle,'Approved JE with type: '+recordType+' and Id: '+recordId);
		sendApprovedEmail(jeRecord);
		nlapiLogExecution('debug',logTitle,'Email indicating JE is approved sent');
		var reversalNumber = nlapiLookupField(recordType,recordId,'reversalnumber');
		nlapiLogExecution('debug',logTitle,'reversalNumber: '+reversalNumber);
		if(!isEmpty(reversalNumber))
		{
			nlapiLogExecution('debug',logTitle,'approving the reversal JE.');
			var reversalJErecord = getReversalRecord(reversalNumber);
			nlapiLogExecution('debug',logTitle,'approving the reversal JE.');
			//var fields = ['custbody_script_status','custbody_genesys_je_approvedby','custbody_genesys_approved_date','postingperiod'];
			var fields = ['custbody_script_status','custbody_genesys_je_approvedby','custbody_genesys_approved_date'];
			var today = new Date();
			//var values = [STATUS_APPROVED,user_approved,nlapiDateToString(today) + ' ' + nlapiDateToString(today, 'timeofday'),postperiod];
			var values = [STATUS_APPROVED,user_approved,nlapiDateToString(today) + ' ' + nlapiDateToString(today, 'timeofday')];
			nlapiSubmitField(recordType,reversalJErecord,'custbody_script_status',STATUS_APPROVED);
			nlapiLogExecution('debug',logTitle,'Approved Reversal JE with Id: '+reversalJErecord);
		}
	}
}

/**
 * Description:  Search for the reversal JE using the number of this JE.
 */
function getReversalRecord(reversalNumber)
{
	var logTitle = 'getReversalRecord';
	var filters = [];
	var columns = [];
	filters.push(new nlobjSearchFilter('tranid', null,'is',reversalNumber));
	columns.push(new nlobjSearchColumn('internalid', null, 'group'));
	columns.push(new nlobjSearchColumn('recordtype', null, 'group'));
	var reversalSearchResults = nlapiSearchRecord('journalentry',null, filters, columns);
	if (isEmpty(reversalSearchResults) )
	{
		throw nlapiCreateError('JE APPROVAL ERROR','Failed to locate reversal JE: ' + reversalNumber + '. Please contact your NetSuite administrator.');
	} 
	else if (reversalSearchResults.length > 1)
	{
		throw nlapiCreateError('JE APPROVAL ERROR','Multiple JEs found for reversal JE: ' + reversalNumber + '. Please contact your NetSuite administrator.');
	}
	var recordType = reversalSearchResults[0].getValue('recordtype',null,'group');
	var recordId = reversalSearchResults[0].getValue('internalid',null,'group');
	nlapiLogExecution('debug',logTitle,'Found reversal record with type: '+recordType+', and Id: '+recordId);
	//var reversalRecord = nlapiLoadRecord(recordType,recordId);
	return recordId;
}

/**
 * Description:  Detects if there were important changes to the JE.  These include:  
 * changes number of lines, changedCurrency, changedExchangeRate, changedLines, changedAccount, 
 * changedCostCenter, changedAmount 
 */
function reRouteIfImportantChanges(oldRecord,newRecord,jeRecord)
{
	var logTitle = 'reRouteIfImportantChanges';
	// First, we make sure that the records load. They should, but if they don't, we'll reject it
	if (!isEmpty(newRecord) && !isEmpty(oldRecord))
	{
		// If there are any important changes, then the JE is rerouted as modified.
		// Removed Posting Period as it provided challenges in implementation
		// var changedPostingPeriod = ( oldRecord.getFieldValue('postingperiod') != newRecord.getFieldValue('postingperiod'));
		// nlapiLogExecution('DEBUG', 'Modified', 'old posting period = '+ oldRecord.getFieldValue('postingperiod') +'. new posting period = '+ newRecord.getFieldValue('postingperiod'));
		var changedCurrency = ( oldRecord.getFieldValue('currency') != newRecord.getFieldValue('currency'));
		nlapiLogExecution('DEBUG',logTitle,'old currency = '+ oldRecord.getFieldValue('currency') +'. new currency = '+ newRecord.getFieldValue('currency'));
		var changedExchangeRate = ( oldRecord.getFieldValue('exchangerate') != newRecord.getFieldValue('exchangerate'));
		nlapiLogExecution('DEBUG',logTitle,'old exchangerate = '+ oldRecord.getFieldValue('exchangerate') +'. new exchangerate = '+ newRecord.getFieldValue('exchangerate'));
		var changedAccount = 0;
		var changedCostCenter = 0;
		var changedAmount = 0;
		var changedLines = false;
		if ( oldRecord.getLineItemCount('line') == newRecord.getLineItemCount('line'))
		{
			for ( var i = 0; i < oldRecord.getLineItemCount('line'); i++) 
			{
				changedAccount += (oldRecord.getLineItemValue('line', 'account', i+1) != newRecord.getLineItemValue('line', 'account', i+1) );
				nlapiLogExecution('DEBUG',logTitle, 'old account = '+ oldRecord.getLineItemValue('line', 'account', i+1) +'. new account = '+ newRecord.getLineItemValue('line', 'account', i+1));

				changedCostCenter += (oldRecord.getLineItemValue('line', 'department', i+1) != newRecord.getLineItemValue('line', 'department', i+1) );
				nlapiLogExecution('DEBUG',logTitle, 'old CostCenter = '+ oldRecord.getLineItemValue('line', 'department', i+1) +'. new CostCenter = '+ newRecord.getLineItemValue('line', 'department', i+1));

				changedAmount += (oldRecord.getLineItemValue('line', 'debit', i+1) != newRecord.getLineItemValue('line', 'debit', i+1) );
				nlapiLogExecution('DEBUG',logTitle, 'old debit = '+ oldRecord.getLineItemValue('line', 'debit', i+1) +'. new debit = '+ newRecord.getLineItemValue('line', 'debit', i+1));

				changedAmount += (oldRecord.getLineItemValue('line', 'credit', i+1) != newRecord.getLineItemValue('line', 'credit', i+1) );
				nlapiLogExecution('DEBUG',logTitle, 'old credit = '+ oldRecord.getLineItemValue('line', 'credit', i+1) +'. new credit = '+ newRecord.getLineItemValue('line', 'credit', i+1));
			}
		} 
		else
		{
			changedLines = true;
			nlapiLogExecution('DEBUG',logTitle, 'old # lines = '+ oldRecord.getLineItemCount('line') +'. new # lines = '+ newRecord.getLineItemCount('line') );
		}
		if ( /*changedPostingPeriod || */ changedCurrency || changedExchangeRate || changedLines || changedAccount || changedCostCenter || changedAmount ) 
		{
			nlapiLogExecution('DEBUG',logTitle, 'changedCurrency = '+ changedCurrency +'.');
			nlapiLogExecution('DEBUG',logTitle, 'changedExchangeRate = '+ changedExchangeRate +'.');
			nlapiLogExecution('DEBUG',logTitle, 'changedLines = '+ changedLines +'.');
			nlapiLogExecution('DEBUG',logTitle, 'changedAccount = '+ changedAccount +'.');
			nlapiLogExecution('DEBUG',logTitle, 'changedAmount = '+ changedAmount +'.');
			nlapiLogExecution('DEBUG',logTitle, 'changedCostCenter = '+ changedCostCenter +'.');
			// Added more fields to push values - Nabil Boutaleb 1/10/2014
			var fields = ['custbody_script_status','approved','custbody_genesys_approved_date','custbody_genesys_je_approvedby'];
			var values = [STATUS_WAITING,'F','',''];
			nlapiSubmitField(jeRecord.getRecordType(),jeRecord.getId(), fields, values);
			sendModifiedJournalEmail(jeRecord);
			nlapiLogExecution('DEBUG',logTitle, 'JE #' + jeRecord.getFieldValue('tranid') + " has been modified. Status is now 'Waiting for Submission' and email has been sent.");
		}
		else nlapiLogExecution('debug',logTitle,'No changes detected, not re-routing for approval.');
	} 
	else 
	{
		// We need to reject. This is unspecified behavior. Trigger email error and rejected error.
		nlapiLogExecution('ERROR',logTitle, "Record objects failed to load. Approval Status is " + (scriptStatus==STATUS_PENDING)?"Pending Approval":"Approved");
		nlapiLogExecution('ERROR',logTitle, "Old Record is " + oldRecord + " and New Record is " + newRecord);
		nlapiSubmitField(jeRecord.getRecordType(), jeRecord.getId(), 'custbody_script_status', STATUS_REJECTED);
		sendRejectedEmail(jeRecord, PROBLEM_LOADING_RECORDS);
	}
}

/**
 * Description:   Determines if the employee is 'approved to post' (checkbox on employee record).
 * If not, the JE is rejected and the reject email is sent out.  If so, and the save for later checkbox 
 * is checked the status is changed to 'waiting'.  Else, it determines the approvers for the JE
 * and sets the status to pending approval and sends the 'waiting for approval' email.  If no
 * approvers are found it rejects the JE and sends the 'reject because no approvers' email.
 */
function submitForApproval(jeRecord)
{
	var logTitle = 'submitForApproval';
    var userID = nlapiGetUser();
    var userRole = nlapiGetContext().getRoleId();
    var employeeSearchResult = searchEmployees(userID);
    var isApprovedToPost = employeeSearchResult[0].getValue('custentity_approved_post');
    if(isApprovedToPost == 'F' && userRole != 'administrator')
	{
		nlapiSubmitField(jeRecord.getRecordType(), jeRecord.getId(), 'custbody_script_status', STATUS_REJECTED);
		sendRejectedEmail(jeRecord, NO_RIGHTS_TO_POST);
    } 
	else if (nlapiGetFieldValue('custbody_save_for_later') == 'T')
	{
		// If it is saved for later, we change the status to waiting. Otherwise we set approvers.
		nlapiSubmitField(nlapiGetRecordType(), nlapiGetRecordId(), 'custbody_script_status', STATUS_WAITING);
	} 
	else 
	{
		// We set approvers on the record.
		setJEApprovers(jeRecord);
		// If the approvers were set correctly, we change the status to pending approval and send approval email.
		// If not, we reject the JE
		var approvers = getJEApprovers(jeRecord);
		if (approvers.primary != "" ) 
		{
			nlapiSubmitField(jeRecord.getRecordType(), jeRecord.getId(), 'custbody_script_status', STATUS_PENDING);
			sendWaitingForApprovalEmail(jeRecord);
		}
		else 
		{
			nlapiSubmitField(jeRecord.getRecordType(), jeRecord.getId(), 'custbody_script_status', STATUS_REJECTED);
			sendRejectedEmail(jeRecord, NO_APPROVERS);
		}
	}
}

/**
 * Descriptions: determines if the context is a JE created from 1) rev rec 2) voiding 3) amortization 4) allocation 
 * 5) system 6) FAM
 * If this is the case, false is returned (isScriptAllowed is false)
 * If this isn't the case, true is returned (isScriptAllowed is true)
 */
function isScriptAllowed()
{
	var logTitle = 'isScriptAllowed';
	var isFromRevRec = nlapiGetFieldValue('isfromrevrec');
	var isVoid = nlapiGetFieldValue('void');
	var isFromAmortization = nlapiGetFieldValue('isfromamortization');
	var isFromAlloc = nlapiGetFieldValue('isfromexpensealloc');
	//var isReversal = nlapiGetFieldValue('isreversal');    changed by Srinadh on 4/8/2015
	var isFromSystem = ( ( nlapiGetFieldValue('custbody_genesys_created_by')==SYSTEM_USER_ID) || ( nlapiGetFieldValue('custbody_genesys_created_by') == SYSTEM ) );
	var subsidiary = nlapiGetFieldValue('subsidiary'); // added by Hardip 09122016, including Auto Elimination subsidiaries for auto-approval 
	// var eliminationSubsidiary8199 = '88';	removed 10082016 by Hardip Jammmu
	var eliminationSubsidiary8999 = '41';
	// var eliminationSubsidiary8598 = '122';   removed 10082016 by Hardip Jammmu
	var eliminationSubsidiary8599 = '86';
	var isFAM = false;
	var JE_Type = nlapiGetRecordType();
	var JE_id = nlapiGetRecordId();
	if(JE_id != '' && JE_id != null)
	{
	var filters = [];
	var columns = [];
	filters.push(new nlobjSearchFilter('internalid',null,'is',JE_id));
	filters.push(new nlobjSearchFilter('memo',null,'contains','(FAM)'));
	columns.push(new nlobjSearchColumn('internalid', null, 'group'));
	var fam_je = nlapiSearchRecord(JE_Type,null, filters, columns);
	if (!isEmpty(fam_je))
	{
	isFAM = true;
	}
	var filters1 = [];
	var columns1 = [];
	filters1.push(new nlobjSearchFilter('internalid',null,'is',JE_id));
	filters1.push(new nlobjSearchFilter('memo',null,'contains','(NC-FAM)'));
	columns1.push(new nlobjSearchColumn('internalid', null, 'group'));
	var fam_je1 = nlapiSearchRecord(JE_Type,null, filters1, columns1);
	if (!isEmpty(fam_je1))
	{
	isFAM = true;
	}
    var filters2 = [];
	var columns2 = [];
	filters2.push(new nlobjSearchFilter('internalid',null,'is',JE_id));
	filters2.push(new nlobjSearchFilter('memo',null,'contains','Asset Disposal:'));
	columns2.push(new nlobjSearchColumn('internalid', null, 'group'));
	var fam_je2 = nlapiSearchRecord(JE_Type,null, filters2, columns2);
	if (!isEmpty(fam_je2))
	{
	isFAM = true;
	}
	}
	nlapiLogExecution('debug',logTitle,'isFromSystem: '+isFromSystem+', isFromRevRec: '+isFromRevRec+', isVoid: '+isVoid+', isFromAmortization: '+isFromAmortization+', isFromAlloc: '+isFromAlloc+', isFromFAM: '+isFAM);    //changes of Matthew by Srinadh
	if (isFromRevRec=='T'||isVoid=='T'||isFromAmortization=='T'||isFromAlloc=='T'||isFromSystem==true ||isFAM==true || subsidiary == eliminationSubsidiary8599 || subsidiary == eliminationSubsidiary8999) return false;
	else return true;
}

/**
 * Description: Determines who are the approvers and creates the custom record:  JE Approvers
 */
function setJEApprovers(jeRecord)
{         
	var logTitle='setJEApprovers';
	var jeSub = jeRecord.getFieldValue('subsidiary');
	var jeId = jeRecord.getId();
	nlapiLogExecution('DEBUG',logTitle, "Record Id is " + jeId);
	var recoType = jeRecord.getRecordType();
	nlapiLogExecution('DEBUG',logTitle, "Record Type is " + recoType);
	nlapiLogExecution('DEBUG',logTitle, "Subsidiary is " + jeSub);
	var employeeIntID = jeRecord.getFieldValue('custbody_genesys_created_by');
	var empSub = nlapiLookupField('employee',employeeIntID, 'subsidiary');
	// If the Sub is Netherlands, we use the sub of the user who initially created the Journal
	if ( jeSub == NETHERLANDS ) 
	{
		// To get subsidiary of user who created the Journal
		if(isEmpty(empSub))
		{
			throw nlapiCreateError('JE APPROVAL ERROR','No subsidiary found for employee with Id: ' + employeeIntID + '. Please contact your NetSuite administrator.');
		}
		jeSub = empSub;
		nlapiLogExecution('DEBUG',logTitle, "Since Sub ID was Netherlands, we change it to " + jeSub);
	}
	var region = null;
	var region = getJERegion(jeSub,jeRecord);
    nlapiLogExecution('DEBUG','region', region);
	var jeLineInfo = getJElineInfo(jeRecord);
	var isRevenue = jeLineInfo.isRevenue;
	//var isTaxable = jeLineInfo.isTaxable;
	var empsearch = searchForEmployeeExceptions(employeeIntID);
	if (!isEmpty(empsearch))
	{
	    var primaryApprover = empsearch[0].getValue('custrecord_excep_primary_approver');
	    var secondaryApprover = empsearch[0].getValue('custrecord_excep_secondary_approver');
	    cleanUpOldApprovers(jeRecord);
	    var approverRecord = nlapiCreateRecord('customrecord_je_approvers');
		approverRecord.setFieldValue('custrecord_je_number', jeRecord.getId());
		approverRecord.setFieldValue('custrecord_je_primary_approver_record',primaryApprover);
		approverRecord.setFieldValue('custrecord_je_secondary_approvers_record',secondaryApprover);
        approverRecord.setFieldValue('custrecord_je_approvers_region',region);
		nlapiSubmitRecord(approverRecord);
		nlapiLogExecution('DEBUG',logTitle, "Approver Record was created from Employee Exception Table");
	}
	else if (isEmpty(empsearch))
	{
	  if(isRevenue == 'T')
	  {
	    var revsearch = searchForRevenueApprovers(region);
	    if (!isEmpty(revsearch))
	    {
	    var primaryApprover = revsearch[0].getValue('custrecord_rev_primary_approver');
	    var secondaryApprover = revsearch[0].getValue('custrecord_rev_secondary_approver');
		cleanUpOldApprovers(jeRecord);
		var secondaryApprovers = removeSubmitterIfSecondaryApprover(secondaryApprover,employeeIntID);
	    var approverRecord = nlapiCreateRecord('customrecord_je_approvers');
		approverRecord.setFieldValue('custrecord_je_number', jeRecord.getId());
		approverRecord.setFieldValue('custrecord_je_primary_approver_record',primaryApprover);
		approverRecord.setFieldValue('custrecord_je_secondary_approvers_record',secondaryApprovers);
        approverRecord.setFieldValue('custrecord_je_approvers_region',region);
        approverRecord.setFieldValue('custrecord_je_is_revenue',isRevenue);
        nlapiSubmitRecord(approverRecord);
		nlapiLogExecution('DEBUG',logTitle, "Approver Record was created from Revenue Approvers Table");
		}
	  }
	  else if(isRevenue == 'F')
	  {	
	    var supervisor = nlapiLookupField('employee',employeeIntID, 'supervisor');
		var super_supervisor = nlapiLookupField('employee',supervisor, 'supervisor');
		if(supervisor == CFO || supervisor == CEO)
		{
		supervisor = CFO_CEO_Replacement;
		}
		if(super_supervisor == CFO || super_supervisor == CEO)
		{
		super_supervisor = CFO_CEO_Replacement;
		}
		cleanUpOldApprovers(jeRecord);
		var approverRecord = nlapiCreateRecord('customrecord_je_approvers');
		approverRecord.setFieldValue('custrecord_je_number', jeRecord.getId());
		if(supervisor != null && supervisor != '')
		{
		approverRecord.setFieldValue('custrecord_je_primary_approver_record',supervisor);
		}
		if(super_supervisor != null && super_supervisor != '')
		{
		approverRecord.setFieldValue('custrecord_je_secondary_approvers_record',super_supervisor);
		}
        approverRecord.setFieldValue('custrecord_je_approvers_region',region);
		nlapiSubmitRecord(approverRecord);
		nlapiLogExecution('DEBUG',logTitle, "Approver Record was created using Supervisors of JE creator");
	  }
	}
	
	/*if(isTaxable == 'T')
	{
	var filters = [new nlobjSearchFilter('isinactive',null,'is','F')];
	var columns = [new nlobjSearchColumn('custrecord_jam_tax_primary_approver'),
	               new nlobjSearchColumn('custrecord_jam_tax_secondary_approver')];
	var TaxExceptions = nlapiSearchRecord('customrecord_jam_tax_approvers', null, filters, columns);
	if(!isEmpty(TaxExceptions))
	{
	var primaryTaxApprover = TaxExceptions[0].getValue('custrecord_jam_tax_primary_approver');
	var secondaryTaxApprover = TaxExceptions[0].getValue('custrecord_jam_tax_secondary_approver');
	var approverRecord = nlapiCreateRecord('customrecord_je_approvers');
	approverRecord.setFieldValue('custrecord_je_number', jeRecord.getId());
	approverRecord.setFieldValue('custrecord_je_primary_approver_record',primaryTaxApprover);
	approverRecord.setFieldValue('custrecord_je_secondary_approvers_record',secondaryTaxApprover);
    approverRecord.setFieldValue('custrecord_je_approvers_region',region);
    approverRecord.setFieldValue('custrecord_je_is_revenue',isRevenue);
	nlapiSubmitRecord(approverRecord);
	nlapiLogExecution('DEBUG',logTitle, "Approver Record was created by Tax Exception Table");
	}
	}*/
	var params = new Array();
	params['custscript_param_jeid'] = jeId;
	params['custscript_param_jert'] = recoType;
	params['custscript_param_region'] = region;
	params['custscript_param_isrevenue'] = isRevenue;
	var schedStatus = nlapiScheduleScript('customscript_tax_approvers_on_je', null, params);
	nlapiLogExecution('DEBUG', 'Scheduled Script (Set Tax Approvers on JE) Journal ID = ',  jeId);
}

/**
 * Description: Search for User exceptions to get Approvers if any exception
 */
function searchForEmployeeExceptions(employeeIntID)
{
if (!isEmpty(employeeIntID))
{
    var filters = [new nlobjSearchFilter('custrecord_je_creator',null,'is',employeeIntID),
	               new nlobjSearchFilter('isinactive',null,'is','F')];
	var columns = [new nlobjSearchColumn('custrecord_excep_primary_approver'),
	               new nlobjSearchColumn('custrecord_excep_secondary_approver')];
	var EmployeeExceptions = nlapiSearchRecord('customrecord_jam_user_exception', null, filters, columns);
	return EmployeeExceptions;
}
}

/**
 * Description: Search for approvers if JE is a revenue JE based upon region of JE
 */
function searchForRevenueApprovers(region)
{
if (!isEmpty(region))
{
    var filters = [new nlobjSearchFilter('custrecord_jam_region',null,'is',region),
	               new nlobjSearchFilter('isinactive',null,'is','F')];
	var columns = [new nlobjSearchColumn('custrecord_rev_primary_approver'),
	               new nlobjSearchColumn('custrecord_rev_secondary_approver')];
	var RegionApprovers = nlapiSearchRecord('customrecord_jam_revenue_approvers', null, filters, columns);
	return RegionApprovers;
}
}

/**
 * Description: Searches the region in the custom record: JE Regions, based on the subsidiary for the JE.  
 */
function getJERegion(jeSub,jeRecord)
{
	var logTitle = 'getJERegion';
	var filters = [];
	var columns = [];
	filters.push(new nlobjSearchFilter('custrecord_je_subsidiary',null,'is',jeSub));
	columns.push(new nlobjSearchColumn('custrecord_je_region'));
	var regionResults = nlapiSearchRecord('customrecord_je_regions',null,filters,columns);
	// If no region found, set to rejected, with error message.	
	// By returning, we ensure that the approvers are not set, which will make sure to put the JE in Rejected state.
	if ( isEmpty(regionResults) )
	{
		throw nlapiCreateError('JE APPROVAL ERROR','No Region was found for JE: ' + jeRecord.getId() + '. Please contact your NetSuite administrator.');
	} 
	else if (regionResults.length > 1)
	{
		throw nlapiCreateError('JE APPROVAL ERROR','Multiple Regions found for JE: ' + jeRecord.getId() + '. Please contact your NetSuite administrator.');
	}
	else 
	{
		region = regionResults[0].getValue('custrecord_je_region');
		nlapiLogExecution('DEBUG',logTitle, "Region is " + regionResults[0].getText('custrecord_je_region'));
	}
	return region;
}

/**
 * Description: Determines if the JE 'is Revenue' and 'is Taxable' by looping through the je lines
 */
function getJElineInfoOLD(jeRecord)
{	
	var logTitle = 'getJElineInfo';
	var isRevenue = 'F';
	var isTaxable = 'F';
	var numLines = jeRecord.getLineItemCount('line');
	for ( var i = 1; i <= numLines; i++)
	{
		var accountId = jeRecord.getLineItemValue('line','account',i);
		var acc_type = jeRecord.getLineItemText('line','custcol_account_type',i);
		var acc_tax = jeRecord.getLineItemValue('line','custcol_taxable_account',i);
		var acc_name = jeRecord.getLineItemText('line','account',i);
		nlapiLogExecution('debug',logTitle,' AccNumber: '+acc_name+', AccType: '+acc_type+', AccTax: '+acc_tax);
		var acc_first3_num = acc_name.substring(0,3);
		nlapiLogExecution('DEBUG',logTitle,'first 3 numbers of account: '+acc_first3_num);
		if(acc_type == 'Deferred Revenue' || (acc_type == 'Income' && acc_first3_num == 500))
		{
			isRevenue = 'T';
		}
		if(acc_tax == 'T')
		{
			isTaxable = 'T';
		}
	}
	if (jeRecord.getRecordType()=='intercompanyjournalentry')
	{
		isRevenue = 'F';                  
	}
	nlapiLogExecution('debug',logTitle,'isTaxable: '+isTaxable);
	nlapiLogExecution('debug',logTitle,'isRevenue: '+isRevenue);
	var lineInfo = {};
	lineInfo.isRevenue = isRevenue;
	lineInfo.isTaxable = isTaxable;
	nlapiLogExecution('debug',logTitle,JSON.stringify(lineInfo));
	return lineInfo;
}

/**
 * Description: Determines if the JE 'is Revenue' and 'is Taxable' by looping through the je lines
 */
function getJElineInfo(jeRecord)
{	
	var logTitle = 'getJElineInfo';
	var isRevenue = 'F';
	//var isTaxable = 'F';
	var jeSub = jeRecord.getFieldValue('subsidiary');
	nlapiLogExecution('DEBUG',logTitle,'Subsidiary'+jeSub);
	var searchResults = searchJE(jeRecord.getId(),'journalentry');
	for ( var i = 0; i < searchResults.length; i++)
	{
		var acc_type = searchResults[i].getValue('type','account');
		//var acc_tax = searchResults[i].getValue('custrecord_taxable_account','account');
		var acc_name = searchResults[i].getValue('name','account');
		var acc_num = searchResults[i].getValue('account');
		nlapiLogExecution('debug',logTitle,' AccNumber: '+acc_name+', AccType: '+acc_type+', AccNum: '+acc_num);
		var acc_first3_num = acc_name.substring(0,3);
		nlapiLogExecution('DEBUG',logTitle,'first 3 numbers of account: '+acc_first3_num);
		if(acc_type == 'Deferred Revenue' || (acc_type == 'Income' && acc_first3_num == 500) && isRevenue  == 'F' )
		{
			isRevenue = 'T';
		}
		/*var filters = [new nlobjSearchFilter('custrecord_tax_account',null,'is',acc_num),
	               new nlobjSearchFilter('custrecord_tax_subsidiary',null,'is',jeSub)];
	    var columns = [];
	    var TaxCriteriaSearch = nlapiSearchRecord('customrecord_je_tax_criteria_table', null, filters, columns);
		nlapiLogExecution('DEBUG',logTitle,'tax criteria search'+TaxCriteriaSearch);
		if(!isEmpty(TaxCriteriaSearch) && isTaxable == 'F')
		{
			isTaxable = 'T';
		}*/
	}
	if (jeRecord.getRecordType()=='intercompanyjournalentry')
	{
		isRevenue = 'F';                  
	}
	//nlapiLogExecution('debug',logTitle,'isTaxable: '+isTaxable);
	nlapiLogExecution('debug',logTitle,'isRevenue: '+isRevenue);
	var lineInfo = {};
	lineInfo.isRevenue = isRevenue;
	//lineInfo.isTaxable = isTaxable;
	nlapiLogExecution('debug',logTitle,JSON.stringify(lineInfo));
	return lineInfo;
}

function searchJE(jeId,jeType){
	var filters = [];
	var columns = [];
	filters.push(new nlobjSearchFilter('internalid',null,'is',jeId));
	columns.push(new nlobjSearchColumn('type','account'));
	columns.push(new nlobjSearchColumn('custrecord_taxable_account','account'));
	columns.push(new nlobjSearchColumn('name','account'));
	columns.push(new nlobjSearchColumn('account'));
	var jeSearchResults = nlapiSearchRecord(jeType,null,filters,columns);
	if (isEmpty(jeSearchResults) ){
		throw nlapiCreateError('JE APPROVAL ERROR','JE Record Not Found for JE with Id: ' + jeId + '. Please contact your NetSuite administrator.');
	}
	return jeSearchResults;
}
/**
 * Description: makes inactive all entries in the custom record: JE Approvers for the current JE.
 */
function cleanUpOldApprovers(jeRecord)
{
	var logTitle = 'cleanUpOldApprovers';
	var filters = [new nlobjSearchFilter('isinactive',null,'is','F')];
	var columns = [];
	filters.push(new nlobjSearchFilter('custrecord_je_number',null,'anyof',jeRecord.getId()));
	var oldApprovers = nlapiSearchRecord('customrecord_je_approvers', null, filters, columns);
	if(!isEmpty(oldApprovers))
	{
		for ( var p = 0; p < oldApprovers.length; p++)
		{
			nlapiSubmitField('customrecord_je_approvers', oldApprovers[p].getId(), 'isinactive', 'T');
			nlapiLogExecution('DEBUG',logTitle, "Inactivating approver id  " + oldApprovers[p].getId());
		}
	}
}

/**
 * Description: determines if the current submitter is a secondary approver and if so removes this person
 * as a secondary approver (to avoid submitter being able to approve their own JE when they are a secondary approver).
 */
function removeSubmitterIfSecondaryApprover(secondaryApprover,employeeIntID)   
{
	var logTitle='removeSubmitterIfSecondaryApprover';
	if (!isEmpty(secondaryApprover) && employeeIntID==secondaryApprover)
	{
		        // Make sure submitter is not a secondary approver
				nlapiLogExecution('debug',logTitle,'createdby: '+employeeIntID);
				// remove secondary approver if they're the creator
				nlapiLogExecution('debug',logTitle,'secondaryApprover'+secondaryApprover); 
				secondaryApprover = '';
				nlapiLogExecution('debug',logTitle,'secondary approver removed: '+temp);
	}
	return secondaryApprover;
}

/**
 * Description:  Searches the custom record 'JE Approvers' to get the primary and secondary approvers.
 * If more than one result is returned, an error is thrown.
 */
function getJEApprovers(jeRecord)
{                  
	var logTitle = 'getJEApprovers';
	approvers = {};
	approvers.primary = [];
	approvers.secondary = [];
	approvers.list = [];
	var filters = [ new nlobjSearchFilter('custrecord_je_number',null,'anyof',jeRecord.getId()),
	                new nlobjSearchFilter('isinactive',null,'is','F')];
	var columns = [new nlobjSearchColumn('custrecord_je_primary_approver_record'),
	               new nlobjSearchColumn('custrecord_je_secondary_approvers_record')];
	var approverResults = nlapiSearchRecord('customrecord_je_approvers', null, filters, columns);
	// Added by Nabil Boutaleb - 3/10/2014 : Added error management.
	// There should only be one result.
	if(!isEmpty(approverResults))
	{
		if (approverResults.length == 1)
		{
			approvers.primary = approverResults[0].getValue('custrecord_je_primary_approver_record');
			approvers.list.push(approverResults[0].getValue('custrecord_je_primary_approver_record'));
			approvers.secondary = approverResults[0].getValue('custrecord_je_secondary_approvers_record');
			approvers.list.push(approverResults[0].getValue('custrecord_je_secondary_approvers_record'));
		} 
		else if (approverResults.length == 2)
		{
		  for(i=0;i<approverResults.length;i++)
		  {
		    approvers.primary.push(approverResults[i].getValue('custrecord_je_primary_approver_record'));
			approvers.list.push(approverResults[i].getValue('custrecord_je_primary_approver_record'));
			approvers.secondary.push(approverResults[i].getValue('custrecord_je_secondary_approvers_record'));
		    approvers.list.push(approverResults[i].getValue('custrecord_je_secondary_approvers_record'));
		  }
		}  
		else if (approverResults.length > 2)
		{
			throw nlapiCreateError('JE APPROVAL ERROR','Multiple Approver Records were found for JE ' + jeRecord.getId() + '.  Please contact your NetSuite administrator.');
		}
	}
	nlapiLogExecution('debug',logTitle,JSON.stringify(approvers));
	return approvers;
}

/**
 * This function calls a suitelet to get info on the employee record. This info
 * includes 'Approved To Post JE' and 'Name' of the employee.
 */
function GetEmployeeInfo(userID) 
{
	var logTitle='GetEmployeeInfo';
	var employeeInfoJsonString = '';
	var url = nlapiResolveURL('suitelet','customscript_findemployapprovpostjeinfo','customdeploy_findemployapprovpostjeinfo') + '&employeeID=' + userID;
	var response = nlapiRequestURL(url, null, null, null, null);
	if (response.getBody() != null && response.getBody() != '') 
	{
		employeeInfoJsonString = response.getBody();
	}
	return employeeInfoJsonString;
}

/**
 * Sends email with JEs to be approved to the approver.
 */
function sendEmailWithJEsToBeApproved(approver)
{
	var logTitle = 'sendEmailWithJEsToBeApproved';
	var body = '';
	var jeUrl = '';
    var context = nlapiGetContext().getEnvironment();
    if (context == 'SANDBOX') 
	{
    	jeUrl = NS_SBX_URL;
    } 
	else if (context == 'PRODUCTION')
	{
    	jeUrl = NS_PROD_URL;
    }
	jeUrl += NS_SS_JE_TO_BE_APPROVED;
	body +='Greetings,<br><br>';
	body +='Please click the link below to view the NetSuite journal entries that are pending your approval.<br><br>';
	body +='Note: you must be logged into your NetSuite account for this link to work.<br><br>';
	body +='<a href=' + jeUrl + '> JEs pending your approval </a><br><br>';
	body +='Kind Regards,<br><br>Your NetSuite administrator'; 
	// removed verification email - Nabil Boutaleb 2/21/2014
	nlapiSendEmail(SYSTEM,approver,'NetSuite journal entries are pending your approval',body);
}

/**
 * Sends email inidicating the JE has been modified and needs to be re-submitted.
 */
function sendModifiedJournalEmail(jeRecord) 
{
	var logTitle = 'sendModifiedJournalEmail';
	var creator = jeRecord.getFieldValue('custbody_genesys_created_by');	
    var jeNumber = jeRecord.getFieldValue('tranid');
    var subject = 'Journal Entry # ' + jeNumber + ' was modified';
    var sender = nlapiGetUser();
    var recordIdsObj = {};
    var jeUrl = '';
    var context = nlapiGetContext().getEnvironment();
    if (context == 'SANDBOX') 
	{
    	jeUrl = NS_SBX_URL;
    } 
	else if (context == 'PRODUCTION')
	{
    	jeUrl = NS_PROD_URL;
    }
    jeUrl += nlapiResolveURL('RECORD', jeRecord.getRecordType(), jeRecord.getId(), 'view');
    jeUrl += COMPID;
    var emailBody = '';
    emailBody = '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Journal Entry</title></head>';
    emailBody += '<body style="position: absolute; left: 0; top: 0;margin-left:0.1em;margin-right:0.1em">';
    emailBody += '<div>';
    emailBody += OPEN_PARA + 'This Journal Entry has been modified. It is now waiting for submission.' + CLOSE_PARA;
    emailBody += OPEN_PARA + '<a href="'; 
    emailBody += jeUrl;
    emailBody += '">';
    emailBody += 'View Journal Entry Record';
    emailBody += '<\a>' + CLOSE_PARA;
    emailBody += LINE_BREAK;
    try 
	{
		nlapiSendEmail(SYSTEM, creator, subject, emailBody, null, null, recordIdsObj, null);
	} 
	catch (error)
	{
		nlapiLogExecution('ERROR',logTitle,'Email was not sent for employee with internal id: ' + creator + " sender : " + sender + " jeNumber : " + jeNumber + " error : " + error.name + " " + error.message);
		// Added by Nabil Boutaleb - 3/10/2014 : Added IT Alerts email
		sendGroupEmail(SYSTEM, IT_ALERTS, 'JE Approval Error : Email Not Sent', 'Modified Transaction Email was not sent for JE ' + jeRecord.getId() + '.\n\nPlease investigate.\n\n' + error.name +'\n\n' + error.message);	
		nlapiSendEmail(SYSTEM, nlapiGetUser(), 'JE Approval Error : Email Not Sent', 'Modified Transaction Email was not sent for JE ' + jeRecord.getId() + '.\n\nPlease contact NetSuite Administrator.\n\n' + error.name +'\n\n' + error.message);	
		throw error;
	}
}

/**
 * Sends email indicating the JE has been rejected.
 */
function sendRejectedEmail(jeRecord, reason)
{
	var logTitle = 'sendRejectedEmail';
	var creator = jeRecord.getFieldValue('custbody_genesys_created_by');
	var jeNumber = jeRecord.getFieldValue('tranid');
    var subject = 'Journal Entry # ' + jeNumber + ' was rejected';
    var sender = nlapiGetUser();
    var recordIdsObj = {};
    recordIdsObj['entity'] = creator;
    recordIdsObj['transaction'] = jeRecord.getId();
    var jeUrl = '';
    var context = nlapiGetContext().getEnvironment();
    if (context == 'SANDBOX') 
	{
    	jeUrl = NS_SBX_URL;
    } 
	else if (context == 'PRODUCTION')
	{
    	jeUrl = NS_PROD_URL;
    }
    jeUrl += nlapiResolveURL('RECORD', jeRecord.getRecordType(), jeRecord.getId(), 'view');
    jeUrl += COMPID;
    var emailBody = '';
    emailBody = '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Journal Entry</title></head>';
    emailBody += '<body style="position: absolute; left: 0; top: 0;margin-left:0.1em;margin-right:0.1em">';
    emailBody += '<div>';
    emailBody += OPEN_PARA + 'This Journal Entry has been rejected.' + CLOSE_PARA;
    // Add a note for rejection of a JE.
    if(!isEmpty(reason))
	{
		var note = nlapiCreateRecord('note');
		note.setFieldValue('transaction',jeRecord.getId());
		note.setFieldValue('note',reason);
		note.setFieldValue('title','Rejected Explanation');
		note.setFieldValue('author',nlapiGetUser());
		nlapiSubmitRecord(note);
		emailBody += OPEN_PARA + 'Reason : ' + reason + CLOSE_PARA; 
    }
    emailBody += OPEN_PARA + '<a href="'; 
    emailBody += jeUrl;
    emailBody += '">';
    emailBody += 'View Journal Entry Record';
    emailBody += '<\a>' + CLOSE_PARA;
    emailBody += LINE_BREAK;
    try 
	{
		nlapiSendEmail(sender, creator, subject, emailBody, null, null, recordIdsObj, null);
	} 
	catch (error)
	{
		nlapiLogExecution('ERROR',logTitle,'Email was not sent for employee with internal id: ' + creator + " sender : " + sender + " jeNumber : " + jeNumber + " error : " + error.name + " " + error.message);
		// Added by Nabil Boutaleb - 3/10/2014 : Added IT Alerts email		
		sendGroupEmail(SYSTEM, IT_ALERTS, 'JE Approval Error : Email Not Sent', 'Rejected Email was not sent for JE ' + jeRecord.getId() + '.\n\nPlease investigate.\n\n' + error.name +'\n\n' + error.message);	
		nlapiSendEmail(SYSTEM, nlapiGetUser(), 'JE Approval Error : Email Not Sent', 'Rejected Email was not sent for JE ' + jeRecord.getId() + '.\n\nPlease contact NetSuite Administrator.\n\n' + error.name +'\n\n' + error.message);		
		throw error;
	}
}

/**
 * Function to send group emails to approvers
 */
function sendGroupEmail(author, group, subject, body) 
{
	var logTitle = 'sendGroupEmail';
	var emailResults = nlapiSearchRecord('entitygroup',null,new nlobjSearchFilter('internalid',null,'is',group),new nlobjSearchColumn('email','groupmember'));
	var recipients = [];
	for ( var int = 0; int < emailResults.length; int++)
	{
		recipients[int] = emailResults[int].getValue('email','groupmember'); 
	}
	recipients = recipients.toString();
	try 
	{
		nlapiSendEmail(author, recipients, subject, body);		
	} 
	catch (error) 
	{
		nlapiLogExecution('ERROR',sendGroupEmail,'Group Email was not sent: sender :' + author + " recipients : " + recipients + " error : " + error.name + " " + error.message);
	}
}

/**
 * description: sends email indicating JE has been approved. 
 * email sent from the approver to the creator. 
 */
function sendApprovedEmail(jeRecord) 
{
	var logTitle='sendApprovedEmail';
	var jeCreator=jeRecord.getFieldValue('custbody_genesys_created_by');
	var jeNumber=jeRecord.getFieldValue('tranid');
	var jeApprover=nlapiGetUser();
    var subject = 'Journal Entry # ' + jeNumber + ' was approved';
    var recordIdsObj = {};
    var jeUrl = '';
    var context = nlapiGetContext().getEnvironment();
    if (context == 'SANDBOX') 
	{
    	jeUrl = NS_SBX_URL;
    } 
	else if (context == 'PRODUCTION')
	{
    	jeUrl = NS_PROD_URL;
    }
    jeUrl += nlapiResolveURL('RECORD', jeRecord.getRecordType(), jeRecord.getId(), 'view');
    jeUrl += COMPID;
    var emailBody = '';
    emailBody = '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Journal Entry</title></head>';
    emailBody += '<body style="position: absolute; left: 0; top: 0;margin-left:0.1em;margin-right:0.1em">';
    emailBody += '<div>';
    emailBody += OPEN_PARA + 'This Journal Entry has been approved.' + CLOSE_PARA;
    emailBody += OPEN_PARA + '<a href="'; 
    emailBody += jeUrl;
    emailBody += '">';
    emailBody += 'View Journal Entry Record';
    emailBody += '<\a>' + CLOSE_PARA;
    emailBody += LINE_BREAK;
    try 
	{
		nlapiSendEmail(jeApprover, jeCreator, subject, emailBody, null, null, recordIdsObj, null);
	} 
	catch (error) 
	{
		nlapiLogExecution('ERROR',logTitle,'Email was not sent for employee with internal id: ' + jeCreator + " jeApprover : " + jeApprover + " jeNumber : " + jeNumber + " error : " + error.name + " " + error.message);
		// Added by Nabil Boutaleb - 3/10/2014 : Added IT Alerts email
		sendGroupEmail(SYSTEM, IT_ALERTS, 'JE Approval Error : Email Not Sent', 'Approved Email was not sent for JE ' + nlapiGetRecordId() + '.\n\nPlease investigate.\n\n' + error.name +'\n\n' + error.message);
		nlapiSendEmail(SYSTEM, IT_ALERTS, 'JE Approval Error : Email Not Sent', 'Approved Email was not sent for JE ' + nlapiGetRecordId() + '.\n\nPlease contact Netsuite Administrator.\n\n' + error.name +'\n\n' + error.message);
		throw error;
	}
}

/**
 * description:  Sends email to the primary approver indicating they have a JE pending approval.
 */
function sendWaitingForApprovalEmail(jeRecord)
{
	var logTitle = 'sendWaitingForApprovalEmail';
	var jeId = jeRecord.getId();
	//var approvers = getJEApprovers(jeRecord);
	var jeNumber = '#' + jeRecord.getFieldValue('tranid');
    var subject = SUBJECT.replace('#', jeNumber);
    var sender = nlapiGetUser();
    var body = composeBody(jeRecord);
	try 
	{
	     var filters = [ new nlobjSearchFilter('custrecord_je_number',null,'anyof',jeId),
	                     new nlobjSearchFilter('isinactive',null,'is','F')];
	     var columns = [new nlobjSearchColumn('custrecord_je_primary_approver_record')]
	     var approverResults = nlapiSearchRecord('customrecord_je_approvers', null, filters, columns);
		 if(!isEmpty(approverResults))
	     {
		 if (approverResults.length == 1) 
		 {
		 var apprec = approverResults[0].getId();
		 var apprecord = nlapiLoadRecord('customrecord_je_approvers', apprec);
		 var receip = apprecord.getFieldValue('custrecord_je_primary_approver_record');
		 var recordIdsObj = {};
         recordIdsObj['entity'] = receip;
		 recordIdsObj['transaction'] = jeId;
		 nlapiSendEmail(sender, receip, subject, body, null, null, recordIdsObj, null);
		 }
		 if (approverResults.length == 2)
		 {
		  for(var i=0;i<approverResults.length; i++)
		  {
		   var apprec = approverResults[i].getId();
		   var apprecord = nlapiLoadRecord('customrecord_je_approvers', apprec);
		   var receip = apprecord.getFieldValue('custrecord_je_primary_approver_record');
		   var recordIdsObj = {};
           recordIdsObj['entity'] = receip;
		   recordIdsObj['transaction'] = jeId;
		   nlapiSendEmail(sender, receip, subject, body, null, null, recordIdsObj, null);
		  }
		 }
		 }
	} 
	catch (error) 
	{
		nlapiLogExecution('ERROR',logTitle,'Email was not sent for employee with internal id: ' + receip + " sender : " + sender + " jeId : " + jeId + " error : " + error.name + " " + error.message);
		// Added by Nabil Boutaleb - 3/10/2014 : Added IT Alerts email
		//sendGroupEmail(SYSTEM, IT_ALERTS, 'JE Approval Error : Email Not Sent', 'Waiting for Approval Email was not sent for JE ' + jeRecord.getId() + '.\n\nPlease investigate.\n\n' + error.name +'\n\n' + error.message);
		nlapiSendEmail(SYSTEM, nlapiGetUser(), 'JE Approval Error : Email Not Sent', 'Waiting for Approval Email was not sent for JE ' + jeRecord.getId() + '.\n\nPlease contact NetSuite Administrator.\n\n' + error.name +'\n\n' + error.message);
		throw error;
	}
}

/**
 * description:  This function builds an email body  and sends the notification email to the primary approver.
 */
function composeBody(jeRecord)
{
	var logTitle = 'composeBody';
	var jeUrl = '';
    var context = nlapiGetContext().getEnvironment();
    if (context == 'SANDBOX') 
	{
    	jeUrl = NS_SBX_URL;
    } 
	else if (context == 'PRODUCTION')
	{
    	jeUrl = NS_PROD_URL;
    }
    jeUrl += nlapiResolveURL('RECORD', jeRecord.getRecordType(), jeRecord.getId(), 'view');
    jeUrl += COMPID;
    var emailBody = '';
    emailBody = '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Journal Entry</title></head>';
    emailBody += '<body style="position: absolute; left: 0; top: 0;margin-left:0.1em;margin-right:0.1em">';
    emailBody += '<div>';
    emailBody += OPEN_PARA + 'You have a new Journal Entry to review for approval.' + CLOSE_PARA;
    emailBody += OPEN_PARA + '<a href="'; 
    emailBody += jeUrl;
    emailBody += '">';
    emailBody += 'View Journal Entry Record';
    emailBody += '<\a>' + CLOSE_PARA;
    emailBody += LINE_BREAK;
    emailBody += '<table style="font-family: Arial, Helvetica, sans-serif; font-size: 0.75em; word-wrap: break-word; border-collapse: collapse; border: 1px solid #000; table-layout: fixed; width: 100%;"><tr>';
    emailBody += '<th style="white-space: pre-line; border: 1px solid #000; vertical-align: top; text-align: left;" valign="top" align="left">';
    emailBody += '<div style="position: relative; text-align: center; " align="center">JOURNAL ENTRY APPROVAL</div>';
    emailBody += '</th></tr></table>';    
    emailBody += '<table style="font-family: Arial, Helvetica, sans-serif; font-size: 0.75em; word-wrap: break-word; border-collapse: collapse; border: 1px solid #000; table-layout: fixed; width: 100%;">';
    emailBody += '<tr>';
    emailBody += '<th scope="row" style="white-space: pre-line; border: 1px solid #000; vertical-align: top; text-align: left;" valign="top" align="left">JE #:</th>';
    emailBody += '<td style="white-space: pre-line; border: 1px solid #000; vertical-align: top; text-align: left;" valign="top" align="left">';
    emailBody += jeRecord.getFieldValue('tranid') + '</td>'; // JE Number
    emailBody += '<th scope="row" style="white-space: pre-line; border: 1px solid #000; vertical-align: top; text-align: left;" valign="top" align="left">Created by:</th>';
    emailBody += '<td style="white-space: pre-line; border: 1px solid #000; vertical-align: top; text-align: left;" valign="top" align="left">';
    emailBody += jeRecord.getFieldText('custbody_genesys_created_by') + '</td>'; // Created by
    emailBody += '</tr>';
    var amount = 0;
    // Find the total amount of the JE
    for ( var t = 0; t < jeRecord.getLineItemCount('line'); t++)
	{
    	if(!isEmpty(jeRecord.getLineItemValue('line','debit',t+1)))
		{
    		amount += parseFloat(jeRecord.getLineItemValue('line','debit',t+1));
    	}
    }
    amount = amount.toFixed(2);
    emailBody += '<tr><th scope="row" style="white-space: pre-line; border: 1px solid #000; vertical-align: top; text-align: left;" valign="top" align="left">JE Total Amount:</th>';
    emailBody += '<td style="white-space: pre-line; border: 1px solid #000; vertical-align: top; text-align: left;" valign="top" align="left">';
    emailBody += amount + '</td>'; // JE Total Amount
    emailBody += '</tr>';
    emailBody += '<tr><th scope="row" style="white-space: pre-line; border: 1px solid #000; vertical-align: top; text-align: left;" valign="top" align="left">Reference:</th>';
    emailBody += '<td style="white-space: pre-line; border: 1px solid #000; vertical-align: top; text-align: left;" valign="top" align="left">';
    emailBody += jeRecord.getFieldValue('custbody_genesys_journal_referencenumb') + '</td>'; // Reference
    emailBody += '</tr></table>';
    emailBody += '<table style="font-family: Arial, Helvetica, sans-serif; font-size: 0.75em; word-wrap: break-word; border-collapse: collapse; border: 1px solid #000; table-layout: fixed; width: 100%;">';
    emailBody += '<tr>';
    emailBody += '<th scope="row" style="white-space: pre-line; border: 1px solid #000; vertical-align: top; text-align: left;" valign="top" align="left">Currency:</th>';
    emailBody += '<td style="white-space: pre-line; border: 1px solid #000; vertical-align: top; text-align: left;" valign="top" align="left">';
    emailBody += jeRecord.getFieldText('currency') + '</td>'; // Currency
    emailBody += '<th scope="row" style="white-space: pre-line; border: 1px solid #000; vertical-align: top; text-align: left;" valign="top" align="left">Subsidiary:</th>';
    emailBody += '<td style="white-space: pre-line; border: 1px solid #000; vertical-align: top; text-align: left;" valign="top" align="left">';
    emailBody += jeRecord.getFieldText('subsidiary') + '</td>'; // Subsidiary
    emailBody += '</tr></table>';
    emailBody += '<table style="font-family: Arial, Helvetica, sans-serif; font-size: 0.75em; word-wrap: break-word; border-collapse: collapse; border: 1px solid #000; table-layout: fixed; width: 100%;">';
    emailBody += '<col span="1" style="width:25%;"/>';
	emailBody += '<tr>';
    emailBody += '<th style="white-space: pre-line; border: 1px solid #000; vertical-align: top; text-align: left;" valign="top" align="left">Description:</th>';
    emailBody += '<td style="white-space: pre-line; border: 1px solid #000; vertical-align: top; text-align: left;" valign="top" align="left">';
    emailBody += jeRecord.getFieldValue('custbody_genesys_memo_field') + '</td></tr>'; // Journal Entry Description
    emailBody += '<tr>';
    emailBody += '<th style="white-space: pre-line; border: 1px solid #000; vertical-align: top; text-align: left;" valign="top" align="left">Reference:</th>';
    emailBody += '<td style="white-space: pre-line; border: 1px solid #000; vertical-align: top; text-align: left;" valign="top" align="left">';
    emailBody += jeRecord.getFieldValue('custbody_genesys_journal_referencenumb') + '</td></tr>'; // Reference 
    emailBody += '<tr>';
    emailBody += '<th style="white-space: pre-line; border: 1px solid #000; vertical-align: top; text-align: left;" valign="top" align="left">Transaction Date:</th>';
    emailBody += '<td style="white-space: pre-line; border: 1px solid #000; vertical-align: top; text-align: left;" valign="top" align="left">';
    emailBody += jeRecord.getFieldValue('trandate') + '</td>'; // Transaction Date
    emailBody += '</tr></table>';
    // Try to find a note for this record
    var filters = new nlobjSearchFilter('internalid','transaction','is',jeRecord.getId());
    var columns = [new nlobjSearchColumn('notedate').setSort(), new nlobjSearchColumn('note'), new nlobjSearchColumn('title')];
   	var noteResults = nlapiSearchRecord('note',null, filters, columns);
   	if (!isEmpty(noteResults))
	{
   		emailBody += LINE_BREAK + LINE_BREAK;
   		emailBody += "Last note on the record : ";
   		emailBody += LINE_BREAK + noteResults[0].getValue('date') + '		' + noteResults[0].getValue('title') + '		' + noteResults[0].getValue('note');
   	}
    emailBody += '</div></body></html>';
    return emailBody;
}

/**
 * Description:  searches all of the JE's that are pending approval.
 */
function searchPendingApprovalJEApprovers()
{
	var logTitle='searchPendingApprovalJEApprovers';
	var filters = [];
	var columns = [];
	filters.push(new nlobjSearchFilter('status','custrecord_je_number','is',STATUS_PENDING));
	filters.push(new nlobjSearchFilter('isinactive',null,'is','F')); 
	columns.push(new nlobjSearchColumn('internalid',null,'group'));
	columns.push(new nlobjSearchColumn('custrecord_je_primary_approver_record',null,'group'));
	columns.push(new nlobjSearchColumn('custrecord_je_secondary_approvers_record',null,'group'));
	// Added by Nabil Boutaleb - 3/10/2014 : Added this column for error handling purposes
	columns.push(new nlobjSearchColumn('custrecord_je_number',null,'max'));
	columns.push(new nlobjSearchColumn('created',null,'group'));
	var searchResults = nlapiSearchRecord('customrecord_je_approvers',null, filters, columns);
	return searchResults;
}

/**
 * Description: determines if array contains a particular value.
 */
function arrayContains(v,arr)
{
	var logTitle='arrayContains';
	for(var k = 0; k < arr.length; k++)
	{
        if(arr[k] === v) return true;
    }
    return false;
}

/**
 * Description:  returns the unique values in an array.
 */
function getUniqueValues(array)
{
	var logTitle='getUniqueValues';
	var arr = [];
    for(var w = 0; w < array.length; w++)
	{
        if(!arrayContains(array[w],arr))
		{
            arr.push(array[w]);
        }
    }
    return arr; 
}

/**
 * Description:  Searches the employee record to determine if the employee is approved to post JE's
 */
function searchEmployees(userID) 
{
	var logTitle='searchEmployees';
	var filters = [];
	var columns = [];
	filters.push(new nlobjSearchFilter('internalid', null,'is', userID));
	columns.push(new nlobjSearchColumn('custentity_approved_post'));
	columns.push(new nlobjSearchColumn('entityid'));
	var searchResults = nlapiSearchRecord('employee',null, filters, columns);
	return searchResults;
}

/**
 * Description:  Searches for system JEs that are from 1) rev rec 2) allocation 3) voided AND are pending approval AND are not memorized.
 */
function searchSystemJEs()
{
	var logTitle='searchSystemJEs';
	var filters = [];
	var columns = [];
	//Journal:A is pending approval
	filters = [[['isrevrectransaction','is', 'T'],'OR',['isallocation','is','T'],'OR',['voided','is','T']],'AND',['status', 'anyof', 'Journal:A'],'AND',['memorized','is','F']];
	columns.push(new nlobjSearchColumn('internalid', null, 'group'));
	var searchResult = nlapiSearchRecord('journalentry', null, filters, columns);
	return searchResult;
}

function isEmpty(val) 
{
    var logTitle='isEmpty';
	return (val == null || val == '');	
}

// function to get posting period
function postingperiod()
{
var d = new Date();
var month = new Array();
month[0] = "Jan";
month[1] = "Feb";
month[2] = "Mar";
month[3] = "Apr";
month[4] = "May";
month[5] = "Jun";
month[6] = "Jul";
month[7] = "Aug";
month[8] = "Sep";
month[9] = "Oct";
month[10] = "Nov";
month[11] = "Dec";
var n = month[d.getMonth()]; 
var year = d.getFullYear();
var posting_period = n+' '+year;
return posting_period;
}

function isPeriodAllowedForPosting(period)
{
       var logTitle = 'isPeriodAllowedForPosting';
       var isAllowed = false;
       var filters = [];
       var columns = [];
       filters.push(new nlobjSearchFilter('internalid', null,'is',period));
       columns.push(new nlobjSearchColumn('periodname'));
       columns.push(new nlobjSearchColumn('closed'));
       columns.push(new nlobjSearchColumn('alllocked'));
       columns.push(new nlobjSearchColumn('aplocked'));
       columns.push(new nlobjSearchColumn('arlocked'));

       var searchResults = nlapiSearchRecord('accountingperiod',null, filters, columns);

       if(isEmpty(searchResults)) throw nlapiCreateError('INVALID ACCOUNTING PERIOD','The accounting period with id: '+period+'does not exist.  Please contact your NetSuite Administrator.');
       if(searchResults.length != 1)
	   {
       throw nlapiCreateError('UNEXPECTED ERROR','More than one accounting period found for the specified adjustment date.  Please contact your NetSuite administrator.');
       }
       
//Define logic here.
       if(searchResults[0].getValue('closed') == 'T' || searchResults[0].getValue('alllocked') == 'T' || searchResults[0].getValue('aplocked') == 'T' || searchResults[0].getValue('arlocked') == 'T')
	   {
              isAllowed=false;
              return isAllowed;
       }
       else{
              isAllowed=true;
              return isAllowed;
       }
       nlapiLogExecution('debug',logTitle,'Period: '+period+', isAllowed: '+isAllowed);
}