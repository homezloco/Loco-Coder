#include <iostream>
#include <vector>
#include <string>

// A simple C++ example to demonstrate basic functionality
int main() {
  std::cout << "Hello, C++ World!" << std::endl;
  
  // Create a vector of numbers
  std::vector<int> numbers = {1, 2, 3, 4, 5};
  
  // Calculate sum
  int sum = 0;
  for (int num : numbers) {
    sum += num;
  }
  
  std::cout << "Sum of numbers: " << sum << std::endl;
  
  // String operations
  std::string message = "C++ is powerful";
  std::cout << "Message: " << message << std::endl;
  std::cout << "Length: " << message.length() << std::endl;
  
  return 0;
}
