#include <iostream>
#include <cstdlib>
#include <iomanip>

int main(int argc, char* argv[]) {
    if (argc != 3) { std::cerr << "Usage: divide <a> <b>" << std::endl; return 1; }
    double a = std::atof(argv[1]);
    double b = std::atof(argv[2]);
    if (b == 0.0) { std::cerr << "Error: division por cero" << std::endl; return 1; }
    std::cout << std::fixed << std::setprecision(6) << a / b << std::endl;
    return 0;
}