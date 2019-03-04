package com.genesys.javamail;

import com.sun.mail.util.LineInputStream;
import java.io.IOException;
import java.io.PrintStream;
import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.Properties;
import javax.mail.Address;
import javax.mail.MessagingException;
import javax.mail.NoSuchProviderException;
import javax.mail.SendFailedException;
import javax.mail.Session;
import javax.mail.Transport;
import javax.mail.internet.InternetAddress;
import javax.mail.internet.MimeMessage;
//import oracle.jdbc.driver.OracleCallableStatement;
import oracle.jdbc.*;
//import oracle.jdbc.driver.OracleDriver;
//import oracle.jdbc.driver.OracleResultSet;
import oracle.sql.BLOB;

public class MessageSender
{
  final int NEW_MSG_STATUS = 0;
  final int OK_MSG_STATUS = 1;
  final int WARN_MSG_STATUS = -1;
  final int ERR_MSG_STATUS = -2;
  final int ERR_MSG_TOOBIG_STATUS = -3;
  Connection conn;
  Statement getMsgsStmt;
  OracleResultSet getMsgsRset;
  OracleCallableStatement logStatusStmt;
  Session session;
  Transport transport;
  boolean isDebugRecipient;
  
  
  public MessageSender()
    throws Exception, MessagingException, NoSuchProviderException, SQLException
  {
    try
    {
      connectDB();
      openSQL();
      openSMTP();
    }
    catch (Exception localException)
    {
      close();
      throw localException;
    }
  }
  
  public MessageSender(int paramInt)
    throws Exception, MessagingException, NoSuchProviderException, SQLException
  {
    try
    {
      connectDB();
      openSQL(paramInt);
      openSMTP();
    }
    catch (Exception localException)
    {
      close();
      throw localException;
    }
  }
  
  protected void connectDB()
    throws SQLException
  {
    OracleDriver localOracleDriver = new OracleDriver();
    this.conn = localOracleDriver.defaultConnection();
    
    this.conn.setAutoCommit(false);
  }
  
  protected void openSMTP()
    throws NoSuchProviderException
  {
    Properties localProperties = System.getProperties();
    
    localProperties.put("mail.smtp.host", Defaults.getMAILSERVER());
    localProperties.put("mail.smtp.sendpartial", "true");
    localProperties.put("mail.smtp.user", "");
    localProperties.put("mail.smtp.from", Defaults.getENVELOPE_FROM());
    
    localProperties.put("mail.smtp.connectiontimeout", Defaults.getSMTP_CONNECT_TIMEOUT());
    
    localProperties.put("mail.smtp.timeout", Defaults.getSMTP_CONNECT_TIMEOUT());
    
    Session localSession = Session.getDefaultInstance(localProperties, null);
    
    this.transport = localSession.getTransport("smtp");
  }
  
  protected void openSQL()
    throws SQLException
  {
    this.getMsgsStmt = this.conn.createStatement();
    this.getMsgsRset = ((OracleResultSet)this.getMsgsStmt.executeQuery(Defaults.getMESSAGES_NEW_QUERY()));
  }
  
  protected void openSQL(int paramInt)
    throws SQLException
  {
    this.getMsgsStmt = this.conn.createStatement();
    this.getMsgsRset = ((OracleResultSet)this.getMsgsStmt.executeQuery(Defaults.getMESSAGE_BYID_QUERY() + paramInt));
  }
  
  public void close()
    throws SQLException, MessagingException
  {
    try
    {
      try
      {
        if (this.getMsgsRset != null)
        {
          this.getMsgsRset.close();
          this.getMsgsRset = null;
        }
        if (this.getMsgsStmt != null)
        {
          this.getMsgsStmt.close();
          this.getMsgsStmt = null;
        }
        if (this.logStatusStmt != null)
        {
          this.logStatusStmt.close();
          this.logStatusStmt = null;
        }
      }
      finally
      {
        if (this.conn != null)
        {
          this.conn.commit();
          this.conn.close();
          this.conn = null;
        }
      }
    }
    finally
    {
      if (this.transport != null)
      {
        this.transport.close();
        this.transport = null;
      }
      this.session = null;
    }
  }
  
  protected void finalize()
    throws Throwable
  {
    try
    {
      close();
    }
    finally
    {
      super.finalize();
    }
  }
  
  public void debugOut()
    throws SQLException, IOException, MessagingException
  {
    try
    {
      if (this.getMsgsRset.next())
      {
        LineInputStream localLineInputStream = new LineInputStream(this.getMsgsRset.getBLOB(2).getBinaryStream());
        System.out.println();
        String str;
        while ((str = localLineInputStream.readLine()) != null) {
          System.out.println(str);
        }
      }
    }
    finally
    {
      close();
    }
  }
  
  protected void logStatus(int paramInt, String paramString)
  {
    try
    {
      if (this.getMsgsRset != null)
      {
        if (this.logStatusStmt == null) {
          this.logStatusStmt = ((OracleCallableStatement)this.conn.prepareCall(Defaults.getLOGSTATUS_QUERY()));
        }
        this.logStatusStmt.setROWID(1, this.getMsgsRset.getROWID(1));
        this.logStatusStmt.setInt(2, paramInt);
        this.logStatusStmt.setString(3, paramString);
        this.logStatusStmt.execute();
      }
    }
    catch (Exception localException)
    {
      System.out.println(localException.toString());
    }
  }
  
  protected void sendMessage()
  {
    MimeMessage localMimeMessage;
    try
    {
      localMimeMessage = new MimeMessage(this.session, this.getMsgsRset.getBLOB(2).getBinaryStream());
    }
    catch (Exception localException)
    {
      logStatus(-2, String.valueOf("Message creation failed: ") + localException.toString()); return;
    }
    try
    {
      Address[] arrayOfAddress;
      if (Defaults.getDEBUG_RECIPIENT().length() == 0)
      {
        arrayOfAddress = localMimeMessage.getAllRecipients();
        if ((arrayOfAddress == null) || (arrayOfAddress.length == 0))
        {
          logStatus(-2, "No recipients in this message"); return;
        }
      }
      else
      {
        arrayOfAddress = new Address[] { new InternetAddress(Defaults.getDEBUG_RECIPIENT()) };
      }
      this.transport.sendMessage(localMimeMessage, arrayOfAddress);
      logStatus(1, null);
    }
    catch (SendFailedException localSendFailedException)
    {
      logStatus(-1, String.valueOf("Message was not sent to all/some addresses: ") + localSendFailedException.toString()); return;
    }
    catch (MessagingException localMessagingException)
    {
      Object localObject = localMessagingException;
      do
      {
        String str = ((Exception)localObject).getMessage();
        if (((localObject instanceof IOException)) || (str == null) || (str.length() == 0))
        {
          logStatus(0, String.valueOf("Message send failed: ") + localMessagingException.toString()); return;
        }
        if ((Character.isDigit(str.charAt(0))) && ((localObject instanceof MessagingException))) {
          try
          {
            int i = Integer.parseInt(str.substring(0, 3));
            if (i == 552)
            {
              logStatus(-3, String.valueOf("Message send failed: ") + localMessagingException.toString()); return;
            }
          }
          catch (IndexOutOfBoundsException localIndexOutOfBoundsException)
          {
            logStatus(0, String.valueOf("Message send failed: ") + localMessagingException.toString()); return;
          }
          catch (NumberFormatException localNumberFormatException)
          {
            logStatus(0, String.valueOf("Message send failed: ") + localMessagingException.toString()); return;
          }
        }
      } while (((localObject instanceof MessagingException)) && ((localObject = ((MessagingException)localObject).getNextException()) != null));
      logStatus(-2, String.valueOf("Message send failed: ") + localMessagingException.toString());
      
      return;
    }
  }
  
  public void connect()
    throws InterruptedException, MessagingException
  {
    for (int i = 1; i <= Defaults.getSMTP_CONNECT_RETRIES() - 1; i++) {
      try
      {
        if (!this.transport.isConnected()) {
          this.transport.connect(Defaults.getMAILSERVER(), null, null);
        }
        return;
      }
      catch (MessagingException localMessagingException)
      {
        System.out.println(String.valueOf("Waiting. SMTP connect error: ") + localMessagingException.toString());
        Thread.sleep(Defaults.getSMTP_RETRY_PAUSE());
      }
    }
    if (!this.transport.isConnected()) {
      this.transport.connect(Defaults.getMAILSERVER(), null, null);
    }
  }
  
  public void sendall()
    throws SQLException, InterruptedException, MessagingException
  {
    try
    {
      while (this.getMsgsRset.next())
      {
        if (!this.transport.isConnected()) {
          connect();
        }
        sendMessage();
      }
    }
    finally
    {
      close();
    }
  }
}
