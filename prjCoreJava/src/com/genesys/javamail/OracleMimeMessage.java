package com.genesys.javamail;

import com.sun.mail.util.CRLFOutputStream;
import java.io.File;
import java.io.IOException;
import java.io.PrintStream;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.Date;
import java.util.Properties;
import javax.activation.DataHandler;
import javax.activation.FileDataSource;
import javax.mail.Address;
import javax.mail.BodyPart;
import javax.mail.Message;
import javax.mail.Message.RecipientType;
import javax.mail.MessagingException;
import javax.mail.Multipart;
import javax.mail.Session;
import javax.mail.internet.AddressException;
import javax.mail.internet.InternetAddress;
import javax.mail.internet.MimeBodyPart;
import javax.mail.internet.MimeMessage;
import javax.mail.internet.MimeMultipart;
import javax.mail.Transport;

public class OracleMimeMessage
{
  static final int DO_NOT_DELETE = 1;
  static final int DO_DELETE = 0;
  static Properties props;
  static Session session;
  static MimeMessage message;
  static ArrayList addrTo;
  static ArrayList addrCc;
  static ArrayList addrBCc;
  static StringBuffer bodyText;
  static String bodyCharset = "";
  static String bodySubContentType;
  static boolean isMultipart;
  
  public OracleMimeMessage()
  {
    init();
  }
  
  public static void init()
  {
    if (props == null) {
      props = new Properties();
    }
    if (session == null) {
      session = Session.getDefaultInstance(props, null);
    }
    message = new MimeMessage(session);
    addrTo = null;
    addrCc = null;
    addrBCc = null;
    bodyText = null;
    bodyCharset = Defaults.getCHARSET();
    bodySubContentType = null;
    isMultipart = false;
  }
  
  
  protected static void clear()
  {
    props = null;
    session = null;
    message = null;
    addrTo = null;
    addrCc = null;
    addrBCc = null;
    bodyText = null;
    bodyCharset = null;
    bodySubContentType = null;
    isMultipart = false;
  }
  
  public static void setFrom(String paramString1, String paramString2)
    throws Exception
  {
    message.setFrom(new InternetAddress(paramString1, paramString2));
  }
  
  public static String getSubject()
    throws Exception
  {
    return message.getSubject();
  }
  
  public static void setSubject(String paramString)
    throws Exception
  {
    message.setSubject(paramString, Defaults.getCHARSET());
  }
  
  public static void setSubject(String paramString1, String paramString2)
    throws Exception
  {
    message.setSubject(paramString1, paramString2);
  }
  
  public static String getContentType()
    throws Exception
  {
    return message.getContentType();
  }
  
  public static String getDisposition()
    throws Exception
  {
    return message.getDisposition();
  }
  
  public static void setDisposition(String paramString)
    throws Exception
  {
    message.setDisposition(paramString);
  }
  
  public static String getContentID()
    throws Exception
  {
    return message.getContentID();
  }
  
  public static void setContentID(String paramString)
    throws Exception
  {
    message.setContentID(paramString);
  }
  
  public static String getDescription()
    throws Exception
  {
    return message.getDescription();
  }
  
  public static void setDescription(String paramString)
    throws Exception
  {
    message.setDescription(paramString);
  }
  
  public static String getMessageID()
    throws Exception
  {
    return message.getMessageID();
  }
  
  public static void setText(String paramString)
    throws MessagingException
  {
    message.setText(paramString, Defaults.getCHARSET());
  }
  
  public static void setText(String paramString1, String paramString2)
    throws MessagingException
  {
    message.setText(paramString1, paramString2 != null ? paramString2 : Defaults.getCHARSET());
  }
  
  public static void setText(String paramString1, String paramString2, String paramString3)
    throws MessagingException
  {
    message.setContent(paramString1, String.valueOf("text/") + (paramString3 != null ? paramString3 : Defaults.getSUBTYPE()) + "; charset=\"" + (paramString2 != null ? paramString2 : Defaults.getCHARSET()) + "\"");
  }
  
  public static String getHeader(String paramString1, String paramString2)
    throws Exception
  {
    return message.getHeader(paramString1, paramString2);
  }
  
  public static void setHeader(String paramString1, String paramString2)
    throws Exception
  {
    message.setHeader(paramString1, paramString2);
  }
  
  public static void addHeader(String paramString1, String paramString2)
    throws Exception
  {
    message.addHeader(paramString1, paramString2);
  }
  
  public static void removeHeader(String paramString)
    throws Exception
  {
    message.removeHeader(paramString);
  }
  
  public static void addHeaderLine(String paramString)
    throws Exception
  {
    message.addHeaderLine(paramString);
  }
  
  public static void setReplyTo(String paramString)
    throws AddressException, MessagingException
  {
    message.setReplyTo(InternetAddress.parse(paramString, false));
  }
  
  public static void addTo(String paramString1, String paramString2)
    throws Exception
  {
    if (addrTo == null) {
      addrTo = new ArrayList();
    }
    addrTo.add(new InternetAddress(paramString1, paramString2));
  }
  
  public static void addCc(String paramString1, String paramString2)
    throws Exception
  {
    if (addrCc == null) {
      addrCc = new ArrayList();
    }
    addrCc.add(new InternetAddress(paramString1, paramString2));
  }
  
  public static void addBCc(String paramString1, String paramString2)
    throws Exception
  {
    if (addrBCc == null) {
      addrBCc = new ArrayList();
    }
    addrBCc.add(new InternetAddress(paramString1, paramString2));
  }
  
  public static void addLine(String paramString)
    throws Exception
  {
    if (bodyText == null) {
      bodyText = new StringBuffer();
    }
    if (bodyText.length() + paramString.length() > Defaults.getMAX_BODY()) {
      throw new MessagingException(String.valueOf("addLine: cannot add to the body if result is larger than ") + Defaults.getMAX_BODY());
    }
    bodyText.append(paramString);
  }
  
  public static void setBodyCharset(String paramString)
  {
    bodyCharset = paramString;
  }
  
  public static void setBodySubContentType(String paramString)
  {
    bodySubContentType = paramString;
  }
  
  public static void setImportance(String paramString)
    throws MessagingException
  {
    message.setHeader("importance", paramString);
  }
  
  public static int isAddressesEmpty()
  {
    return ((addrTo != null) && (!addrTo.isEmpty())) || ((addrCc != null) && (!addrCc.isEmpty())) || ((addrBCc != null) && (!addrBCc.isEmpty())) ? 0 : 1;
  }
  
  public static void attachFile(String paramString1, String paramString2)
    throws IOException, SQLException, MessagingException
  {
    if ((paramString1 != null) && (paramString1.length() > 0))
    {
      paramString2 = paramString2 != null ? paramString2 : paramString1;
      
      paramString2 = Defaults.getSPOOLDIR() + new File(paramString2).getName();
      Object localObject1;
      if ((!isMultipart) && (!message.isMimeType("multipart/*")))
      {
        localObject1 = new MimeMultipart();
        
        setBodyText();
        
        message.saveChanges();
        
        localObject1 = message.getContent();
        
        String str = message.getContentType();
        if ((localObject1 != null) && (str != null) && (str.length() > 0))
        {
          MimeBodyPart localMimeBodyPart = new MimeBodyPart();
          localMimeBodyPart.setContent(localObject1, str);
          localMimeBodyPart.setDisposition("inline");
          ((Multipart)localObject1).addBodyPart(localMimeBodyPart);
        }
      }
      else
      {
        localObject1 = (Multipart)message.getContent();
      }
      Object localObject2 = new MimeBodyPart();
      ((MimeBodyPart)localObject2).setDisposition("attachment");
      
      ((MimeBodyPart)localObject2).setFileName(paramString1);
      
      ((MimeBodyPart)localObject2).setDataHandler(new DataHandler(new FileDataSource(paramString2)));
      
      ((Multipart)localObject1).addBodyPart((BodyPart)localObject2);
      
      message.setContent((Multipart)localObject1);
      isMultipart = true;
    }
  }
  
  public static void deleteAttachment(String paramString)
  {
    if ((paramString != null) && (paramString.length() > 0)) {
      new File(Defaults.getSPOOLDIR() + new File(paramString).getName()).delete();
    }
  }
  
  protected static void setBodyText()
    throws MessagingException
  {
    if ((bodyText != null) && (!isMultipart)) {
      if (bodySubContentType == null) {
        setText(bodyText.toString(), bodyCharset);
      } else {
        setText(bodyText.toString(), bodyCharset, bodySubContentType);
      }
    }
  }
  
  protected static void savetoDB(MimeMessage paramMimeMessage)
    throws IOException, SQLException, MessagingException
  {
    DBMSLOBOutputStream localDBMSLOBOutputStream = new DBMSLOBOutputStream();
    try
    {
      paramMimeMessage.writeTo(new CRLFOutputStream(localDBMSLOBOutputStream.toStream()));
    }
    finally
    {
      localDBMSLOBOutputStream.close();
      localDBMSLOBOutputStream = null;
    }
  }
  
  public static void send()
    throws IOException, SQLException, MessagingException
  {
    try
    {
      if (addrTo != null) {
        message.addRecipients(Message.RecipientType.TO, (Address[])addrTo.toArray(new Address[addrTo.size()]));
      }
      if (addrCc != null) {
        message.addRecipients(Message.RecipientType.CC, (Address[])addrCc.toArray(new Address[addrCc.size()]));
      }
      if (addrBCc != null) {
        message.addRecipients(Message.RecipientType.BCC, (Address[])addrBCc.toArray(new Address[addrBCc.size()]));
      }
      message.setSentDate(new Date());
      
      setBodyText();
      
      message.saveChanges();
      
      savetoDB(message);
    }
    finally
    {
      clear();
    }
  }
  
  public static void debugOut()
  {
    try
    {
      System.out.println("Properties:");
      System.out.println(String.valueOf("Charset: ") + Defaults.getCHARSET());
      System.out.println(String.valueOf("Debug recipient: ") + Defaults.getDEBUG_RECIPIENT());
      System.out.println(String.valueOf("Envelope from: ") + Defaults.getENVELOPE_FROM());
      System.out.println(String.valueOf("Log status query: ") + Defaults.getLOGSTATUS_QUERY());
      System.out.println(String.valueOf("Mailserver: ") + Defaults.getMAILSERVER());
      System.out.println(String.valueOf("Max body: ") + Defaults.getMAX_BODY());
      System.out.println(String.valueOf("Message by id query: ") + Defaults.getMESSAGE_BYID_QUERY());
      System.out.println(String.valueOf("Message insert query: ") + Defaults.getMESSAGE_INSERT_QUERY());
      System.out.println(String.valueOf("Messages new query: ") + Defaults.getMESSAGES_NEW_QUERY());
      System.out.println(String.valueOf("Number of smtp connect retries: ") + Defaults.getSMTP_CONNECT_RETRIES());
      System.out.println(String.valueOf("Socket timeout: ") + Defaults.getSMTP_CONNECT_TIMEOUT());
      System.out.println(String.valueOf("Smtp connect retry pause: ") + Defaults.getSMTP_RETRY_PAUSE());
      System.out.println(String.valueOf("Attachment spool dir: ") + Defaults.getSPOOLDIR());
      System.out.println(String.valueOf("Text subtype: ") + Defaults.getSUBTYPE());
      System.out.println("End properties");
      if (message != null) {
        message.writeTo(new CRLFOutputStream(System.out));
      }
      Transport.send(message);
    }
    catch (Exception localException)
    {
      System.out.println(String.valueOf("Exception \r\n") + localException.toString());
    }
  }
  
  public static void sendAtOnce(String paramString1, String paramString2, String paramString3, String paramString4, String paramString5, String paramString6, String paramString7, String paramString8, String paramString9, String paramString10, String paramString11, String paramString12, int paramInt)
    throws AddressException, IOException, SQLException, MessagingException
  {
    int i = (paramString11 != null) && (paramString11.length() > 0) ? 1 : 0;
    
    String str1 = paramString7 != null ? paramString7 : "";
    String str2 = (paramString9 != null) && (paramString9.length() > 0) ? paramString9 : Defaults.getCHARSET();
    
    Properties localProperties = System.getProperties();
    MimeMessage localMimeMessage = new MimeMessage(Session.getDefaultInstance(localProperties, null));
    if ((paramString1 != null) && (paramString1.length() > 0)) {
      localMimeMessage.setFrom(new InternetAddress(paramString1));
    }
    if ((paramString2 != null) && (paramString2.length() > 0)) {
      localMimeMessage.setRecipients(Message.RecipientType.TO, InternetAddress.parse(paramString2, false));
    }
    if ((paramString3 != null) && (paramString3.length() > 0)) {
      localMimeMessage.setRecipients(Message.RecipientType.CC, InternetAddress.parse(paramString3, false));
    }
    if ((paramString4 != null) && (paramString4.length() > 0)) {
      localMimeMessage.setRecipients(Message.RecipientType.BCC, InternetAddress.parse(paramString4, false));
    }
    if ((paramString5 != null) && (paramString5.length() > 0)) {
      localMimeMessage.setReplyTo(InternetAddress.parse(paramString5, false));
    }
    localMimeMessage.setSentDate(new Date());
    if ((paramString10 != null) && (paramString10.length() > 0)) {
      localMimeMessage.setHeader("importance", paramString10);
    }
    if ((paramString9 != null) && (paramString9.length() > 0)) {
      localMimeMessage.setSubject(paramString6, paramString9);
    } else {
      localMimeMessage.setSubject(paramString6);
    }
    if (i != 0)
    {
      paramString12 = (paramString12 != null) && (paramString12.length() > 0) ? paramString12 : paramString11;
      
      paramString12 = Defaults.getSPOOLDIR() + new File(paramString12).getName();
      
      MimeBodyPart localMimeBodyPart1 = new MimeBodyPart();
      if ((paramString8 == null) || (paramString8.length() == 0)) {
        localMimeBodyPart1.setText(str1, str2);
      } else {
        localMimeBodyPart1.setContent(str1, String.valueOf("text/") + paramString8 + "; charset=\"" + str2 + "\"");
      }
      localMimeBodyPart1.setDisposition("inline");
      
      MimeBodyPart localMimeBodyPart2 = new MimeBodyPart();
      localMimeBodyPart2.setDisposition("attachment");
      localMimeBodyPart2.setFileName(paramString11);
      localMimeBodyPart2.setDataHandler(new DataHandler(new FileDataSource(paramString12)));
      
      MimeMultipart localMimeMultipart = new MimeMultipart();
      localMimeMultipart.addBodyPart(localMimeBodyPart1);
      localMimeMultipart.addBodyPart(localMimeBodyPart2);
      localMimeMessage.setContent(localMimeMultipart);
    }
    else if ((paramString8 == null) || (paramString8.length() == 0))
    {
      localMimeMessage.setText(str1, str2);
    }
    else
    {
      localMimeMessage.setContent(str1, String.valueOf("text/") + paramString8 + "; charset=\"" + str2 + "\"");
    }
    localMimeMessage.saveChanges();
    
    savetoDB(localMimeMessage);
    //message = localMimeMessage;
    
    if ((paramInt != 1) && (paramString12 != null) && (paramString12.length() > 0)) {
      new File(paramString12).delete();
    }
    
  }
  
  public static void sendAtOnce(String paramString1, String paramString2, String paramString3, String paramString4, String paramString5, String paramString6, String paramString7, String paramString8, String paramString9, String paramString10)
    throws AddressException, IOException, SQLException, MessagingException
  {
    sendAtOnce(paramString1, paramString2, paramString3, paramString4, paramString5, paramString6, paramString7, paramString8, paramString9, paramString10, null, null, 0);
  }
}
