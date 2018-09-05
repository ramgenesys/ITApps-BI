package com.genesys.javamail;

//import java.io.OutputStream;
import java.io.*;
import java.sql.Connection;
import java.sql.SQLException;
//import oracle.jdbc.driver.OracleCallableStatement;
import oracle.jdbc.*;
//import oracle.jdbc.driver.OracleDriver;
import oracle.sql.BLOB;

public class DBMSLOBOutputStream
{
  OutputStream outStream ;
  Connection conn;
  OracleCallableStatement stmt;
  
  public DBMSLOBOutputStream()
    throws SQLException
  {
    OracleDriver localOracleDriver = new OracleDriver();
    this.conn = localOracleDriver.defaultConnection();
    this.conn.setAutoCommit(false);
    setStream();
  }
  
  public DBMSLOBOutputStream(Connection paramConnection)
    throws SQLException
  {
    this.conn = paramConnection;
    this.conn.setAutoCommit(false);
    setStream();
  }
  
  protected void setStream()
    throws SQLException
  {
    this.stmt = ((OracleCallableStatement)this.conn.prepareCall(Defaults.getMESSAGE_INSERT_QUERY()));
    this.stmt.registerOutParameter(1, 2004);
    this.stmt.execute();
    BLOB localBLOB = this.stmt.getBLOB(1);
    this.outStream = localBLOB.getBinaryOutputStream();
  }
  
  public OutputStream toStream()
  {
    return this.outStream;
  }
  
  public void close()
  {
    try
    {
      try
      {
        if (this.outStream != null)
        {
          this.outStream.flush();
          this.outStream.close();
          this.outStream = null;
        }
      }
      finally
      {
        if (this.stmt != null)
        {
          if (this.conn != null)
          {
            this.conn.commit();
            this.conn = null;
          }
          this.stmt.close();
          this.stmt = null;
        }
      }
    }
    catch (Exception localException) {}
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
}
