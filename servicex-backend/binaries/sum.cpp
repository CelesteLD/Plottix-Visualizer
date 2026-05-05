#include <iostream>
#include <cstdlib>

int main(int argc, char* argv[]) {
    if (argc != 3) {
        std::cerr << "Usage: sum <a> <b>" << std::endl;
        return 1;
    }
    double a = std::atof(argv[1]);
    double b = std::atof(argv[2]);
    std::cout << a + b << std::endl;
    return 0;
}