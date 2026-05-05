#include <iostream>
#include <cstdlib>
#include <vector>
#include <sstream>
#include <iomanip>

bool parseMatrix(const std::string& s, int& rows, int& cols, std::vector<std::vector<double>>& M) {
    std::istringstream ss(s);
    if (!(ss >> rows >> cols)) return false;
    M.assign(rows, std::vector<double>(cols));
    for (int i = 0; i < rows; i++)
        for (int j = 0; j < cols; j++)
            if (!(ss >> M[i][j])) return false;
    return true;
}

int main(int argc, char* argv[]) {
    if (argc != 3) { std::cerr << "Usage: matrix_multiply <matA> <matB>" << std::endl; return 1; }

    int rA, cA, rB, cB;
    std::vector<std::vector<double>> A, B;

    if (!parseMatrix(argv[1], rA, cA, A)) { std::cerr << "Error al leer matriz A" << std::endl; return 1; }
    if (!parseMatrix(argv[2], rB, cB, B)) { std::cerr << "Error al leer matriz B" << std::endl; return 1; }

    if (cA != rB) {
        std::cerr << "Error: columnas de A (" << cA << ") deben coincidir con filas de B (" << rB << ")" << std::endl;
        return 1;
    }

    std::vector<std::vector<double>> C(rA, std::vector<double>(cB, 0.0));
    for (int i = 0; i < rA; i++)
        for (int j = 0; j < cB; j++)
            for (int k = 0; k < cA; k++)
                C[i][j] += A[i][k] * B[k][j];

    std::cout << std::fixed << std::setprecision(4);
    for (int i = 0; i < rA; i++) {
        for (int j = 0; j < cB; j++) {
            if (j > 0) std::cout << "  ";
            std::cout << C[i][j];
        }
        std::cout << "\n";
    }
    return 0;
}