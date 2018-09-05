package com.genesys.javamail;

import java.io.PrintStream;
import java.util.Properties;

public final class Defaults
{
  private static Properties mailProps;
  private static final String PROPFILE = "mail.properties";
  private static final String DEFPROPFILE = "mail.default.properties";
  private static String debugRCPT;
  private static String charset;
  
  private static void loadProperties()
  {
    try
    {
      Properties localProperties = new Properties();
      localProperties.load(Class.forName("com.genesys.javamail.Defaults").getResourceAsStream("mail.default.properties"));
      
      mailProps = new Properties(localProperties);
      mailProps.load(Class.forName("com.genesys.javamail.Defaults").getResourceAsStream("mail.properties"));
    }
    catch (Exception localException)
    {
      System.out.print(String.valueOf("Exception in Defaults.loadProperties \r\n") + localException.toString());
    }
  }
  
  public static String getProperty(String paramString1, String paramString2)
  {
    try
    {
      if (mailProps == null) {
        loadProperties();
      }
      return mailProps.getProperty(paramString1, paramString2);
    }
    catch (Exception localException)
    {
      System.out.print(String.valueOf("Exception in Defaults.getProperty \r\n") + localException.toString());
      return paramString2;
    }
  }
  
  public static String getCHARSET()
  {
    if (charset == null) {
      charset = getProperty("genmail.charset", "US-ASCII");
    }
    return charset;
  }
  
  public static String getSUBTYPE()
  {
    return getProperty("genmail.subtype", "plain");
  }
  
  public static String getSPOOLDIR()
  {
    return getProperty("genmail.spooldir", "/.11/spool/");
  }
  
  public static String getDEBUG_RECIPIENT()
  {
    if (debugRCPT == null) {
      debugRCPT = getProperty("genmail.debug_recipient", "");
    }
    return debugRCPT;
  }
  
  public static String getMAILSERVER()
  {
    return getProperty("genmail.mailserver", "localhost");
  }
  
  public static String getENVELOPE_FROM()
  {
    return getProperty("genmail.envelope_from", "gore.bounce@genesyslab.com");
  }
  
  public static int getSMTP_CONNECT_RETRIES()
  {
    return Integer.parseInt(getProperty("genmail.smtp.connect_retries", "5"));
  }
  
  public static int getSMTP_RETRY_PAUSE()
  {
    return Integer.parseInt(getProperty("genmail.smtp.retry_pause", "180000"));
  }
  
  public static String getSMTP_CONNECT_TIMEOUT()
  {
    return getProperty("genmail.smtp.connect_timeout", "10000");
  }
  
  public static int getMAX_BODY()
  {
    return Integer.parseInt(getProperty("genmail.max_body", "131072"));
  }
  
  public static String getMESSAGE_INSERT_QUERY()
  {
    return getProperty("genmail.query.message_insert", "");
  }
  
  public static String getMESSAGES_NEW_QUERY()
  {
    return getProperty("genmail.query.get_new_messages", "");
  }
  
  public static String getMESSAGE_BYID_QUERY()
  {
    return getProperty("genmail.query.get_message_by_id", "");
  }
  
  public static String getLOGSTATUS_QUERY()
  {
    return getProperty("genmail.query.log_status", "");
  }
}
