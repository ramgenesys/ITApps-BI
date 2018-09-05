package com.itapps.genesys;

import java.util.*;
import java.text.*;
import java.io.*;
import javax.activation.DataHandler;
import javax.activation.DataSource;
import javax.activation.FileDataSource;
//import javax.mail.*;
import javax.mail.BodyPart;
import javax.mail.Message;
import javax.mail.MessagingException;
import javax.mail.Multipart;
//import javax.mail.PasswordAuthentication;
import javax.mail.Session;
import javax.mail.Transport;
import javax.mail.internet.InternetAddress;
import javax.mail.internet.MimeBodyPart;
import javax.mail.internet.MimeMessage;
import javax.mail.internet.MimeMultipart;
import java.io.File;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.parsers.DocumentBuilder;
import org.w3c.dom.Document;
import org.w3c.dom.NodeList;
import org.w3c.dom.Node;
import org.w3c.dom.Element;


public class SendMail {
	
	 private static String GetMailAttribute(String Attrib, File xmlFile)
	 {
	 	 // We checked the file already.. so, we don't need to check the file exits or not.
	 	 try{
	 	 	
		 	 DocumentBuilderFactory dbFactory = DocumentBuilderFactory.newInstance();
			 DocumentBuilder dBuilder = dbFactory.newDocumentBuilder();
			 Document doc = dBuilder.parse(xmlFile);
			 doc.getDocumentElement().normalize();
			 NodeList nList = doc.getElementsByTagName("Mail");
			 Node nNode = nList.item(0);
			 Element eElement = (Element) nNode;
			 return eElement.getElementsByTagName(Attrib).item(0).getTextContent(); 	
			}
		catch(Exception _e)
		{
			System.out.println("Ignore this error.");
			 _e.printStackTrace();
			 System.out.println("It is just a note.");
			 return "";
		}	 
	 }
	 
	 private static String GetPropertyValue(String propName)
	 {
		 Properties prop = new Properties();
		 String propFileName = "/com/itapps/genesys/mail.properties";
		 try{
			 InputStream inputStream = SendMail.class.getClassLoader().getResourceAsStream(propFileName);
			 if (inputStream != null) {		 
				   prop.load(inputStream);
				   return prop.getProperty(propName);
			  } else {
					 System.out.println("No property value for " + propName);
					 return "";
			  }
		 }
		 catch (Exception _e)
		 {
			 _e.printStackTrace();
			 return "";
		 }		 
	 }
	 
	 private static String GetDate(String dFormat)
	 {
	 	Date dt = new java.util.Date();
	 	SimpleDateFormat dateFormat = new SimpleDateFormat(dFormat);
		return dateFormat.format(dt);
	 }
	
   public static void main(String[] args) {
      // Recipient's email ID needs to be mentioned.
      
      if (args.length != 1 )
      {
      	System.out.println("Send mail requires xml file as argument.");
      	System.exit(-1);
      }
      
      File x = new File(args[0]);
      if ( !x.exists())
      {
      	System.out.println("XML File doesn't exits..");
      	System.exit(-1);
      }
      
      // Check if file exists or not.
      
      
      //String to = "destinationemail@gmail.com";
      String From = GetMailAttribute("From", x);
      String To = GetMailAttribute("To", x);
      String CC = GetMailAttribute("CC", x);
      String BCC = GetMailAttribute("BCC", x);
      String Subject = GetMailAttribute("Subject", x);
      String Body = GetMailAttribute("Body", x);
      String Attachment = GetMailAttribute("Attachment", x);
      String[] mailList;
      InternetAddress[] recipientAddress;
      //String Mimetype = GetMailAttribute("Mimetype", x);

      // Sender's email ID needs to be mentioned
      //String from = "fromemail@gmail.com";
      if (From.equals(""))
      {
      	From = "it-dba@genesys.com";
      }
      if (To.equals(""))
      {
      	To = "it-dba@genesys.com";
      }
      /*
      if (CC.equals(""))
      {
      	CC = "it-dba@genesys.com";
      }
      if (BCC.equals(""))
      {
      	BCC = "it-dba@genesys.com";
      }
      */
      
      if (Subject.equals(""))
      {
      	Subject = "Sending default subject information for input " + GetDate("yyyy-MM-dd");
      }
      
      if (Body.equals(""))
      {
      	Body = "Sending default subject information for input " + GetDate("yyyy-MM-dd");
      }
      if (!Attachment.equals(""))
      {
    	  File tmpFile = new File(Attachment);
    	  if (!tmpFile.exists())
    	  {
    		  System.out.println("No attachment file found." + Attachment);
    		  Attachment = "";
    	  }
      }

      Properties props = new Properties();
      props.put("mail.smtp.auth", GetPropertyValue("mail.smtp.path")!=""?GetPropertyValue("mail.smtp.path"):"false");
      props.put("mail.smtp.starttls.enable", GetPropertyValue("mail.smtp.starttls.enable")!=""?GetPropertyValue("mail.smtp.starttls.enable"):"false");
      props.put("mail.smtp.host", GetPropertyValue("mail.smtp.host")!=""?GetPropertyValue("mail.smtp.host"):"exchange.genesyslab.com");
      props.put("mail.smtp.port", GetPropertyValue("mail.smtp.port")!=""?GetPropertyValue("mail.smtp.port"):"25");
      
      Session session = Session.getInstance(props);
      // Get the Session object.
      /*
      Session session = Session.getInstance(props,
         new javax.mail.Authenticator() {
            protected PasswordAuthentication getPasswordAuthentication() {
               return new PasswordAuthentication(username, password);
            }
         });
	  */
      try {
         // Create a default MimeMessage object.
         Message message = new MimeMessage(session);

         // Set From: header field of the header.
         message.setFrom(new InternetAddress(From));

         // Set To: header field of the header.
         mailList = To.split(",");
         recipientAddress = new InternetAddress[mailList.length];
         for (int i=0; i<mailList.length; i++)
         {
        	 System.out.println("Adding email - " + mailList[i]);
        	 try{
        		 recipientAddress[i] = new InternetAddress(mailList[i],false);
        	 }
        	 catch(Exception _e)
        	 {
        		 _e.printStackTrace();
        	 }
        	 
         }
         message.setRecipients(Message.RecipientType.TO, InternetAddress.parse(To, true));
         //message.setRecipients(Message.RecipientType.TO, recipientAddress);
         if (!CC.equals(""))
         {
        	 mailList = CC.split(",");
        	 recipientAddress = new InternetAddress[mailList.length];
             for (int i=0; i<mailList.length; i++)
             {
            	 System.out.println("Adding email - " + mailList[i]);
            	 recipientAddress[i] = new InternetAddress(mailList[i]);
             }
        	 message.setRecipients(Message.RecipientType.CC, recipientAddress);
         }
         if (!BCC.equals(""))
         {
        	 mailList = BCC.split(",");
        	 recipientAddress = new InternetAddress[mailList.length];
             for (int i=0; i<mailList.length; i++)
             {
            	 recipientAddress[i] = new InternetAddress(mailList[i]);
             }
        	 message.setRecipients(Message.RecipientType.BCC, recipientAddress);
         }
         // Set Subject: header field
         message.setSubject(Subject);

         // Create the message part
         BodyPart messageBodyPart = new MimeBodyPart();

         // Now set the actual message
         messageBodyPart.setText(Body);

         // Create a multipart message
         Multipart multipart = new MimeMultipart();

         // Set text message part
         multipart.addBodyPart(messageBodyPart);

         // Part two is attachment
         if (!Attachment.equals("")){
	         messageBodyPart = new MimeBodyPart();
	         String filename = Attachment;
	         DataSource source = new FileDataSource(filename);
	         messageBodyPart.setDataHandler(new DataHandler(source));
	         messageBodyPart.setFileName(Attachment.substring(Attachment.lastIndexOf("\\")+1));
	         multipart.addBodyPart(messageBodyPart);
         }

         // Send the complete message parts
         message.setContent(multipart, "text/html; charset=utf-8");

         // Send message
         Transport.send(message);

         System.out.println("Sent message successfully....");
  
      } catch (MessagingException e) {
         throw new RuntimeException(e);
      }
   }
}