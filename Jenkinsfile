node {
	stage ('SCM checkout'){
		git "https://github.com/Abhinesh467/Report.git"
		}
	stage ('Build'){
    	dir("TestReport") {
	   sh "mvn clean install"
       }
     }
}
