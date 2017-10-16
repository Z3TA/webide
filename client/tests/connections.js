(function() {
	"use strict";
	
	EDITOR.addTest(function sftpConnection(callback) {
		
		var protocol = "sftp";
		var serverAddress = "ben.100m.se";
		var testFolder = protocol + "://" + serverAddress + "/uploads/deletemeuniquefolder/";
		var testFile = "testReadWrite.txt";
		var testText = "abc123\n";
		
		/*
			Setting up the sftp test server:
			1. Create sftpusers group.
			# sudo groupadd sftpusers
			
			2. Comment out setting disabling SFTP access from sshd config file.
			# sudo sed -i "s/Subsystem sftp \/usr\/lib\/openssh\/sftp-server/#Subsystem sftp \/usr\/lib\/openssh\/sftp-server/" /etc/ssh/sshd_config
			
			3. Open sshd config file sudo nano /etc/ssh/sshd_config, add below snippet
			# sudo nano /etc/ssh/sshd_config
			
			#enable sftp
			Subsystem sftp internal-sftp
			
			Match Group sftpusers
			ChrootDirectory %h #set the home directory
			ForceCommand internal-sftp
			X11Forwarding no
			AllowTCPForwarding no
			PasswordAuthentication yes
			
			4. Restart ssh.
			# service ssh restart
			
			5. Create a user
			# sudo adduser sftptest
			# sudo usermod -g sftpusers sftptest
			# sudo usermod -s /bin/nologin sftptest
			# sudo chown root:sftptest /home/sftptest
			# sudo chmod 755 /home/sftptest
			# sudo mkdir /home/sftptest/uploads
			# sudo chown sftptest:sftptest /home/sftptest/uploads
			# sudo chmod 755 /home/sftptest/uploads
			
		*/
		
		
		CLIENT.cmd("connect", {protocol: protocol, serverAddress: serverAddress, user: "sftptest", passw: "12345"}, function(err, json) {
			if(err) throw err
			else {
				
				//var workingDirectory = json.workingDirectory;
				
				EDITOR.createPath(testFolder, function folderCreated(err, path) {
					if(err) throw err;
					EDITOR.saveToDisk(testFolder + testFile, testText, fileCreated);
				});
				
				function fileCreated(err, path) {
					if(err) throw err;
					
					
					CLIENT.cmd("readFromDisk", {path: path, returnBuffer: false, encoding: "utf8"}, function(err, json) {
						if(err) throw err
						else {
							if(json.path.indexOf(testFile) == -1) throw new Error("path=" + path);
							if(json.data != testText) throw new Error("json.data=" + json.data + " is not testText=" + testText);
							
							// Cleanup
							CLIENT.cmd("deleteFile", {filePath: testFolder + testFile}, function(err, json) {
								if(err) throw err
								else {
									
									// Cleanup
									CLIENT.cmd("deleteDirectory", {directory: testFolder}, function(err, json) {
										if(err) throw err
										else {
											
											// Cleanup
											CLIENT.cmd("disconnect", {protocol: protocol, serverAddress: serverAddress}, function(err, json) {
												if(err) throw err
												else {
													
													callback(true);
													
												}
											});
											
										}
									});
									
								}
							});
							
						}
					});
				}
				
			}
		});
		
	});
	
	
	EDITOR.addTest(function ftpFindInFiles(callback) {
		// todo!
		
		callback(true);
		
	});
	
	
})();
