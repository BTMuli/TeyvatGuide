//! @file src/yae/pipe.rs
//! @desc Yae 命名管道监听模块 (Windows only)
//! @since Beta v0.8.7

use log::{error, info};
use std::io::{Read, Write};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::{AppHandle, Emitter, Manager};
use tokio::sync::Mutex;
use windows::core::PCSTR;
use windows::Win32::Foundation::{CloseHandle, ERROR_BROKEN_PIPE, HANDLE};
use windows::Win32::Storage::FileSystem::{ReadFile, WriteFile};
use windows::Win32::System::Pipes::{
  ConnectNamedPipe, CreateNamedPipeA, DisconnectNamedPipe, PIPE_ACCESS_DUPLEX,
  PIPE_READMODE_BYTE, PIPE_TYPE_BYTE, PIPE_UNLIMITED_INSTANCES, PIPE_WAIT,
};

const PIPE_NAME: &str = "\\\\.\\pipe\\TeyvatGuide_Yae";
const BUFFER_SIZE: u32 = 8192;

lazy_static::lazy_static! {
  static ref LISTENER_RUNNING: Arc<AtomicBool> = Arc::new(AtomicBool::new(false));
  static ref PIPE_HANDLE: Arc<Mutex<Option<HANDLE>>> = Arc::new(Mutex::new(None));
}

/// Start Yae named pipe listener
#[tauri::command]
pub async fn start_yae_listener(app: AppHandle) -> Result<String, String> {
  if LISTENER_RUNNING.load(Ordering::Relaxed) {
    return Ok("Yae listener already running".to_string());
  }

  LISTENER_RUNNING.store(true, Ordering::Relaxed);
  
  tokio::spawn(async move {
    info!("Starting Yae pipe listener on {}", PIPE_NAME);
    
    loop {
      if !LISTENER_RUNNING.load(Ordering::Relaxed) {
        break;
      }

      match create_pipe_instance() {
        Ok(pipe) => {
          info!("Waiting for Yae client connection...");
          
          unsafe {
            if ConnectNamedPipe(pipe, None).is_ok() || 
               windows::Win32::Foundation::GetLastError() == windows::Win32::Foundation::ERROR_PIPE_CONNECTED {
              info!("Yae client connected");
              
              if let Err(e) = handle_client(pipe, &app).await {
                error!("Error handling Yae client: {}", e);
              }
              
              let _ = DisconnectNamedPipe(pipe);
            }
            
            let _ = CloseHandle(pipe);
          }
        }
        Err(e) => {
          error!("Failed to create named pipe: {}", e);
          tokio::time::sleep(tokio::time::Duration::from_secs(5)).await;
        }
      }
    }
    
    info!("Yae pipe listener stopped");
  });

  Ok("Yae listener started".to_string())
}

/// Stop Yae named pipe listener
#[tauri::command]
pub async fn stop_yae_listener() -> Result<String, String> {
  LISTENER_RUNNING.store(false, Ordering::Relaxed);
  
  // Close the pipe handle if it exists
  let mut handle = PIPE_HANDLE.lock().await;
  if let Some(pipe) = *handle {
    unsafe {
      let _ = CloseHandle(pipe);
    }
    *handle = None;
  }
  
  Ok("Yae listener stopped".to_string())
}

fn create_pipe_instance() -> Result<HANDLE, String> {
  unsafe {
    let pipe = CreateNamedPipeA(
      PCSTR(PIPE_NAME.as_ptr()),
      PIPE_ACCESS_DUPLEX,
      PIPE_TYPE_BYTE | PIPE_READMODE_BYTE | PIPE_WAIT,
      PIPE_UNLIMITED_INSTANCES,
      BUFFER_SIZE,
      BUFFER_SIZE,
      0,
      None,
    );

    if pipe.is_invalid() {
      return Err("Failed to create named pipe".to_string());
    }

    Ok(pipe)
  }
}

async fn handle_client(pipe: HANDLE, app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
  let mut buffer = vec![0u8; BUFFER_SIZE as usize];
  let mut bytes_read = 0u32;

  unsafe {
    if ReadFile(
      pipe,
      Some(&mut buffer),
      Some(&mut bytes_read),
      None,
    )
    .is_ok()
    {
      if bytes_read > 0 {
        info!("Received {} bytes from Yae", bytes_read);
        
        // Parse protobuf and convert to UIAF
        let data = &buffer[..bytes_read as usize];
        match crate::yae::proto::convert_yae_to_uiaf(data) {
          Ok(uiaf_data) => {
            info!("Successfully converted Yae data to UIAF format");
            
            // Emit event to frontend with UIAF data
            let json_str = serde_json::to_string(&uiaf_data)?;
            app.emit("yae_data_received", json_str)?;
            
            // Send success response back to Yae
            let response = b"OK";
            let mut bytes_written = 0u32;
            let _ = WriteFile(
              pipe,
              Some(response),
              Some(&mut bytes_written),
              None,
            );
          }
          Err(e) => {
            error!("Failed to convert Yae data: {}", e);
            
            // Send error response back to Yae
            let response = format!("ERROR: {}", e);
            let mut bytes_written = 0u32;
            let _ = WriteFile(
              pipe,
              Some(response.as_bytes()),
              Some(&mut bytes_written),
              None,
            );
          }
        }
      }
    }
  }

  Ok(())
}
