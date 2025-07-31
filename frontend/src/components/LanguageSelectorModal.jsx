import React, { useState } from 'react';
import '../styles/modal.css'; // Assuming there's a shared modal style

const LanguageSelectorModal = ({ onSelect, onCancel }) => {
  const [selectedCategory, setSelectedCategory] = useState('backend');

  const languages = {
    backend: [
      { id: 'python', name: 'Python', extension: '.py', template: '# Python code\n# Created: ' + new Date().toLocaleString() + '\n\ndef main():\n    print("Hello, world!")\n\nif __name__ == "__main__":\n    main()' },
      { id: 'javascript', name: 'JavaScript', extension: '.js', template: '// JavaScript code\n// Created: ' + new Date().toLocaleString() + '\n\nfunction main() {\n  console.log("Hello, world!");\n}\n\nmain();' },
      { id: 'go', name: 'Go', extension: '.go', template: '// Go code\n// Created: ' + new Date().toLocaleString() + '\n\npackage main\n\nimport (\n\t"fmt"\n)\n\nfunc main() {\n\tfmt.Println("Hello, world!")\n}' },
      { id: 'rust', name: 'Rust', extension: '.rs', template: '// Rust code\n// Created: ' + new Date().toLocaleString() + '\n\nfn main() {\n    println!("Hello, world!");\n}' },
    ],
    mobile: [
      { id: 'swift', name: 'Swift (iOS)', extension: '.swift', template: '// Swift code for iOS\n// Created: ' + new Date().toLocaleString() + '\n\nimport UIKit\n\nclass ViewController: UIViewController {\n\n    override func viewDidLoad() {\n        super.viewDidLoad()\n        // Do any additional setup after loading the view.\n        print("Hello, world!")\n    }\n}' },
      { id: 'kotlin', name: 'Kotlin (Android)', extension: '.kt', template: '// Kotlin code for Android\n// Created: ' + new Date().toLocaleString() + '\n\nfun main() {\n    println("Hello, world!")\n}' },
      { id: 'dart', name: 'Dart (Flutter)', extension: '.dart', template: '// Dart code for Flutter\n// Created: ' + new Date().toLocaleString() + '\n\nimport \'package:flutter/material.dart\';\n\nvoid main() {\n  runApp(MyApp());\n}\n\nclass MyApp extends StatelessWidget {\n  @override\n  Widget build(BuildContext context) {\n    return MaterialApp(\n      home: Scaffold(\n        appBar: AppBar(title: Text("Hello World")),\n        body: Center(child: Text("Hello, world!")),\n      ),\n    );\n  }\n}' },
      { id: 'react-native', name: 'React Native', extension: '.jsx', template: '// React Native code\n// Created: ' + new Date().toLocaleString() + '\n\nimport React from \'react\';\nimport { View, Text, StyleSheet } from \'react-native\';\n\nconst App = () => {\n  return (\n    <View style={styles.container}>\n      <Text style={styles.text}>Hello, world!</Text>\n    </View>\n  );\n};\n\nconst styles = StyleSheet.create({\n  container: {\n    flex: 1,\n    justifyContent: \'center\',\n    alignItems: \'center\',\n    backgroundColor: \'#F5FCFF\',\n  },\n  text: {\n    fontSize: 20,\n    textAlign: \'center\',\n    margin: 10,\n  },\n});\n\nexport default App;' },
      { id: 'csharp', name: 'C# (.NET MAUI/Xamarin)', extension: '.cs', template: '// C# code for .NET MAUI/Xamarin\n// Created: ' + new Date().toLocaleString() + '\n\nusing System;\n\nnamespace HelloWorld\n{\n    public class Program\n    {\n        public static void Main(string[] args)\n        {\n            Console.WriteLine("Hello, world!");\n        }\n    }\n}' },
    ],
    web: [
      { id: 'html', name: 'HTML', extension: '.html', template: '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>Document</title>\n</head>\n<body>\n  <h1>Hello, world!</h1>\n</body>\n</html>' },
      { id: 'css', name: 'CSS', extension: '.css', template: '/* CSS styles\n * Created: ' + new Date().toLocaleString() + '\n */\n\nbody {\n  font-family: Arial, sans-serif;\n  margin: 0;\n  padding: 20px;\n  color: #333;\n}\n\nh1 {\n  color: #0066cc;\n}' },
      { id: 'typescript', name: 'TypeScript', extension: '.ts', template: '// TypeScript code\n// Created: ' + new Date().toLocaleString() + '\n\nfunction greet(name: string): string {\n  return `Hello, ${name}!`;\n}\n\nconsole.log(greet("world"));' },
    ],
    other: [
      { id: 'cpp', name: 'C++', extension: '.cpp', template: '// C++ code\n// Created: ' + new Date().toLocaleString() + '\n\n#include <iostream>\n\nint main() {\n    std::cout << "Hello, world!" << std::endl;\n    return 0;\n}' },
      { id: 'java', name: 'Java', extension: '.java', template: '// Java code\n// Created: ' + new Date().toLocaleString() + '\n\npublic class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, world!");\n    }\n}' },
      { id: 'ruby', name: 'Ruby', extension: '.rb', template: '# Ruby code\n# Created: ' + new Date().toLocaleString() + '\n\nputs "Hello, world!"' },
      { id: 'json', name: 'JSON', extension: '.json', template: '{\n  "message": "Hello, world!",\n  "created": "' + new Date().toLocaleString() + '"\n}' },
      { id: 'plaintext', name: 'Plain Text', extension: '.txt', template: 'Hello, world!\nCreated: ' + new Date().toLocaleString() },
    ]
  };

  const handleLanguageSelect = (language) => {
    onSelect(language);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content language-selector-modal">
        <h2>Select Language</h2>
        
        <div className="language-categories">
          <button 
            className={selectedCategory === 'backend' ? 'active' : ''} 
            onClick={() => setSelectedCategory('backend')}
          >
            Backend
          </button>
          <button 
            className={selectedCategory === 'mobile' ? 'active' : ''} 
            onClick={() => setSelectedCategory('mobile')}
          >
            Mobile
          </button>
          <button 
            className={selectedCategory === 'web' ? 'active' : ''} 
            onClick={() => setSelectedCategory('web')}
          >
            Web
          </button>
          <button 
            className={selectedCategory === 'other' ? 'active' : ''} 
            onClick={() => setSelectedCategory('other')}
          >
            Other
          </button>
        </div>
        
        <div className="language-list">
          {languages[selectedCategory].map((language) => (
            <button
              key={language.id}
              className="language-item"
              onClick={() => handleLanguageSelect(language)}
            >
              {language.name} ({language.extension})
            </button>
          ))}
        </div>
        
        <div className="modal-actions">
          <button onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default LanguageSelectorModal;
