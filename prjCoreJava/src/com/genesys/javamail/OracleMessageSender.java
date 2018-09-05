package com.genesys.javamail;

import java.io.PrintStream;
public class OracleMessageSender
{
  public static void sendall()
  {
    try
    {
      new MessageSender().sendall();
    }
    catch (Exception localException)
    {
      System.out.println(localException.toString());
    }
  }
  
  public static void sendall(int paramInt)
  {
    try
    {
      new MessageSender(paramInt).sendall();
    }
    catch (Exception localException)
    {
      System.out.println(localException.toString());
    }
  }
  
  public static void debugOut()
  {
    try
    {
      new MessageSender().debugOut();
    }
    catch (Exception localException)
    {
      System.out.println(localException.toString());
    }
  }
  
  public static void debugOut(int paramInt)
  {
    try
    {
      new MessageSender(paramInt).debugOut();
    }
    catch (Exception localException)
    {
      System.out.println(localException.toString());
    }
  }
}
