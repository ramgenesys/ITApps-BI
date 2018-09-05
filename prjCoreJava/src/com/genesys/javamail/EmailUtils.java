package com.genesys.javamail;

import java.io.UnsupportedEncodingException;
import javax.mail.internet.InternetAddress;

public class EmailUtils
{
  public static String GetAddress(String paramString1, String paramString2)
    throws UnsupportedEncodingException
  {
    return new InternetAddress(paramString1, paramString2).toString();
  }
}
