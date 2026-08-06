import logging
import sys     # gives access to sys.stdout, where terminal output goes
import os      # Need to create folder for log file

def setup_logging():
    logger = logging.getLogger("cska")   # create or get a logger object, labelled "cska"
    logger.setLevel(logging.INFO)   # Only record messages at INFO level

    formatter = logging.Formatter("%(asctime)s | %(levelname)s | %(message)s")
    # defines the format of each log line: timestamp | severity | message
    
    console_handler = logging.StreamHandler(sys.stdout)    # a "handler" decides where logs go - here, straight to the terminal
    console_handler.setFormatter(formatter)    # attach that format to the handler

    os.makedirs("logs", exist_ok=True)
    file_handler = logging.FileHandler("logs/app.log") # A second handler, which writes log lines to an actual file logs/app.log instead of a terminal
    file_handler.setFormatter(formatter) 

    if not logger.handlers:
        logger.addHandler(console_handler)
        logger.addHandler(file_handler)   
    # attach the handler to the logger, but only if not already attached
    # (prevents duplicate/repeated log lines if this function ever runs twice)
    # writes to both places simultaneously: terminal(for immediate visibility while developing) and the file(for persistance)

    return logger
    # send back the fully configured logger

logger = setup_logging() # run the setup once here, creating one shared logger object that every other file can import and reuse.  
