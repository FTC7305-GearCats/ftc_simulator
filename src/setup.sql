CREATE TABLE blocks(id INTEGER PRIMARY KEY AUTOINCREMENT,
                    dateModifiedMillis INTEGER,
                    enabled BOOLEAN,
                    escapedName TEXT,
                    name TEXT UNIQUE);
CREATE TABLE samples(id INTEGER PRIMARY KEY AUTOINCREMENT,
                     escapedName TEXT,
                     name TEXT UNIQUE,
                     requestedCapabilities JSON);

INSERT INTO samples VALUES(1,'BasicPOVDrive','BasicPOVDrive','[]');
INSERT INTO samples VALUES(2,'BasicTankDrive','BasicTankDrive','[]');
INSERT INTO samples VALUES(3,'ConceptDeviceInteraction','ConceptDeviceInteraction','[]');
INSERT INTO samples VALUES(4,'ConceptSmoothServo','ConceptSmoothServo','[]');
INSERT INTO samples VALUES(5,'ConceptTensorFlowObjectDetection','ConceptTensorFlowObjectDetection','["camera", "tfod", "vuforia"]');
INSERT INTO samples VALUES(6,'ConceptTensorFlowObjectDetectionWebcam','ConceptTensorFlowObjectDetectionWebcam','["webcam", "tfod", "vuforia"]');
INSERT INTO samples VALUES(7,'ConceptTextToSpeech','ConceptTextToSpeech','[]');
INSERT INTO samples VALUES(8,'ConceptVuMarkDetection','ConceptVuMarkDetection','["vuforia"]');
INSERT INTO samples VALUES(9,'ConceptVuforiaNavSkystone','ConceptVuforiaNavSkystone','["camera", "vuforia"]');
INSERT INTO samples VALUES(10,'ConceptVuforiaNavSkystoneWebcam','ConceptVuforiaNavSkystoneWebcam','["webcam", "vuforia"]');
INSERT INTO samples VALUES(11,'RevBlinkinLed','RevBlinkinLed','[]');
INSERT INTO samples VALUES(12,'SensorDigitalTouch','SensorDigitalTouch','[]');
INSERT INTO samples VALUES(13,'SensorIMU','SensorIMU','[]');
INSERT INTO samples VALUES(14,'SensorREVColorDistance','SensorREVColorDistance','[]');
