#include <iostream>
#include <cstdlib>

int main(int argc, char* argv[]) {
    if (argc != 3) { std::cerr << "Usage: quotient <a> <b>" << std::endl; return 1; }
    long long a = std::atoll(argv[1]);
    long long b = std::atoll(argv[2]);
    if (b == 0) { std::cerr << "Error: division por cero" << std::endl; return 1; }
    std::cout << a / b << " (resto: " << a % b << ")" << std::endl;
    return 0;
}