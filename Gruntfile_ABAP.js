"use strict";

			var rfc = require("node-rfc");

			var fs = require("fs");

			module.exports = function (grunt) {

					// Project specific variables

					var abapDevelopmentUser = "fathima";

					var abapDevelopmentPassword = "Ayaan..1";

					var abapDevelopmentServer = "192.168.0.57";

					var abapDevelopmentInstance = "10";

					var abapDevelopmentClient = "800";

					var abapApplicationName = "ZStackedBar";

					var abapApplicationDesc = "This is for tesing CI/CD";

					var abapPackage = "ZFIORI";

					var transportRequest = "ND5K900040";

					var jobURL = process.env.JOB_URL;

					var nexusSnapshotRepoURL = "http://192.168.0.57:8081/repository/jenkins-repo/";

					var gitCommit = process.env.GIT_COMMIT;

					// Global Variables

					var targetDir = "target";

					var zipFileSuffix = "-opt-static-abap.zip";

					var ctsDataFile = targetDir + "/CTS_Data.txt";

					var nexusGroupId = "grunt-nexus-deployer";

					// Project configuration.

					var abapConn = {

						user: abapDevelopmentUser,

						passwd: abapDevelopmentPassword,

						ashost: abapDevelopmentServer,

						sysnr: abapDevelopmentInstance,

						client: abapDevelopmentClient

					};

					grunt.initConfig({

						pkg: grunt.file.readJSON("package.json"),

						createTransportRequest: {

							options: {

								conn: abapConn,

								author: abapDevelopmentUser,

								description: "Commit: " + gitCommit

							}

						},

						uploadToABAP: {

							options: {

								conn: abapConn,

								zipFile: targetDir + "/<%= pkg.name %>" + zipFileSuffix,

// 								zipFileURL: nexusSnapshotRepoURL + "/" + nexusGroupId.replace(/\./g, "/") +
// 									"/<%= pkg.name %>/<%= pkg.version %>-SNAPSHOT/<%= pkg.name %>-<%= pkg.version %>-SNAPSHOT.zip",

								codePage: "UTF8"

							}

						},

						releaseTransport: {

							options: {

								conn: abapConn

							}

						}

					});

					var rfcConnect = function (functionModule, importParameters, gruntContext) {

						return new Promise(function (resolve, reject) {

							var conn = gruntContext.options().conn;

							var client = new rfc.Client(conn);

							grunt.log.writeln("RFC client lib version:", client.getVersion());

							client.connect(function (err) {

								if (err) { // check for login/connection errors

									grunt.log.errorlns("could not connect to server", err);

									return reject();

								}

								// invoke remote enabled ABAP function module

								grunt.log.writeln("Invoking function module", functionModule);

								client.invoke(functionModule,

									importParameters,

									function (err, res) {

										if (err) { // check for errors (e.g. wrong parameters)

											grunt.log.errorlns("Error invoking", functionModule, err);

											return reject();

										}

										client.close();

										grunt.log.writeln("Messages:", res.EV_LOG_MESSAGES);

										return resolve(res);

									});

							});

						});

					};

					grunt.registerTask("createTransportRequest", "Creates an ABAP Transport Request", function () {

						grunt.log.writeln("Creating Transport Request");

						var importParameters = {

							AUTHOR: this.options().author,

							TEXT: this.options().description

						};

						var done = this.async();

						rfcConnect("BAPI_CTREQUEST_CREATE", importParameters, this)

						.then(

							function (returnValue) {

								if (returnValue.EV_SUCCESS == "E" || returnValue.EV_SUCCESS == "W") {

									grunt.log.errorlns("Error invoking BAPI_CTREQUEST_CREATE.");

									grunt.log.errorlns("Message Id:", returnValue.EV_MSG_ID);

									grunt.log.errorlns("Message No:", returnValue.EV_MSG_NO);

									grunt.log.errorlns("Messages:", returnValue.EV_LOG_MESSAGES);

									done(false);

									return;

								}

								if (returnValue.REQUESTID == "") {

									grunt.log.errorlns("Error invoking BAPI_CTREQUEST_CREATE.");

									grunt.log.errorlns("Transport request could not be created.");

									grunt.log.errorlns(returnValue.RETURN.MESSAGE);

									done(false);

									return;

								}

								grunt.log.writeln("Transport request", returnValue.REQUESTID, "created.");

								if (fs.existsSync(targetDir) === false) {

									fs.mkdirSync(targetDir);

								}

								fs.writeFile(ctsDataFile,

									JSON.stringify(

										{
											REQUESTID: returnValue.REQUESTID
										}

									),

									function (err) {

										if (err) {

											grunt.log.errorlns("Error Creating file:", err);

											done(false);

											return;

										}

										grunt.log.writeln("Created file:", ctsDataFile);

										done();

									}

								)

							},

							function () {

								done(false);

							});

					});

					grunt.registerTask("uploadToABAP", "Uploads the application to the ABAP System", function (transportRequest) {

							grunt.log.writeln("Uploading to ABAP");

							if (!transportRequest) {

								//             if (!fs.existsSync(ctsDataFile)) {

								//                 grunt.log.errorlns("No Transport request specified. Pass one explicitly or run createTransportRequest first.");

								//                 return (false);

								//             }

								//             transportRequest = JSON.parse(fs.readFileSync(ctsDataFile, { encoding: "utf8" })).REQUESTID;

								transportRequest = "ND5K900040";

							}

							grunt.log.writeln("Transport request:", transportRequest);

var url = "";

// if (!(typeof this.options().zipFile === "undefined") && fs.existsSync(this.options().zipFile)) {

// 	//         if (!(typeof this.options().zipFile === "undefined") && fs.existsSync(this.options().zipFile)) {

// 	if (!(typeof this.options().zipFile === "undefined")) {

url = "http://192.168.0.57:8080/job/CI_nw.epm.refapps.ext.shop_master/ws/target/TestReport-opt-static-abap.zip";

// } else {

// 	url = this.options().zipFileURL;

// }

								var importParameters = {

									IV_URL: url,

									IV_SAPUI5_APPLICATION_NAME: abapApplicationName,

									IV_SAPUI5_APPLICATION_DESC: abapApplicationDesc,

									IV_PACKAGE: abapPackage,

									IV_WORKBENCH_REQUEST: transportRequest,

									IV_TEST_MODE: "-",

									IV_EXTERNAL_CODE_PAGE: this.options().codePage

								};

								var done = this.async();

								grunt.log.writeln("Uploading application from", url);

								rfcConnect("/UI5/UI5_REPOSITORY_LOAD_HTTP", importParameters, this)

								.then(

									function (returnValue) {

										if (returnValue.EV_SUCCESS == "E" || returnValue.EV_SUCCESS == "W") {

											grunt.log.errorlns("Error invoking", "/UI5/UI5_REPOSITORY_LOAD_HTTP");

											grunt.log.errorlns("Message Id:", returnValue.EV_MSG_ID);

											grunt.log.errorlns("Message No:", returnValue.EV_MSG_NO);

											grunt.log.errorlns("Messages:", returnValue.EV_LOG_MESSAGES);

											done(false);

											return;

										}

										grunt.log.writeln("Application uploaded.");

										done();

									},

									function () {

										done(false);

									});

							});

						grunt.registerTask("releaseTransport", "Releases an ABAP Transport Request", function (transportRequest) {

							grunt.log.writeln("Releasing Transport Request");

							if (!transportRequest) {

								if (!fs.existsSync(ctsDataFile)) {

									grunt.log.errorlns("No Transport request specified. Pass one explicitly or run createTransportRequest first.");

									return (false);

								}

								transportRequest = JSON.parse(fs.readFileSync(ctsDataFile, {
									encoding: "utf8"
								})).REQUESTID;

							}

							grunt.log.writeln("Transport request:", transportRequest);

							var importParameters = {

								REQUESTID: transportRequest,

								COMPLETE: "X",

								BATCH_MODE: "X"

							}

							var done = this.async();

							rfcConnect("BAPI_CTREQUEST_RELEASE", importParameters, this)

							.then(

								function (returnValue) {

									if (returnValue.EV_SUCCESS == "E" || returnValue.EV_SUCCESS == "W") {

										grunt.log.errorlns("Error invoking", "BAPI_CTREQUEST_RELEASE");

										grunt.log.errorlns("Message Id:", returnValue.EV_MSG_ID);

										grunt.log.errorlns("Message No:", returnValue.EV_MSG_NO);

										grunt.log.errorlns("Messages:", returnValue.EV_LOG_MESSAGES);

										done(false);

										return;

									}

									grunt.log.writeln("Transport request released.");

									done();

								},

								function () {

									done(false);

								});

						});

					}
