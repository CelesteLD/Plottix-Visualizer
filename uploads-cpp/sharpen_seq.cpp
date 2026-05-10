#include <iostream>
#include <vector>
#include <assert.h>
#include <cmath>
#include <png++/png.hpp>
#include <string>
#include <chrono>

using namespace std;

typedef vector<double> Array;
typedef vector<Array>  Matrix;
typedef vector<Matrix> Image;

Matrix getSharpen() {
    return {
        { 0, -1,  0},
        {-1,  5, -1},
        { 0, -1,  0}
    };
}

Image loadImage(const char *filename) {
    png::image<png::rgb_pixel> image(filename);
    Image m(3, Matrix(image.get_height(), Array(image.get_width())));
    for (int h = 0; h < (int)image.get_height(); h++)
        for (int w = 0; w < (int)image.get_width(); w++) {
            m[0][h][w] = image[h][w].red;
            m[1][h][w] = image[h][w].green;
            m[2][h][w] = image[h][w].blue;
        }
    return m;
}

void saveImage(Image &image, const string &filename) {
    assert(image.size() == 3);
    int height = image[0].size();
    int width  = image[0][0].size();
    png::image<png::rgb_pixel> imageFile(width, height);
    for (int y = 0; y < height; y++)
        for (int x = 0; x < width; x++) {
            imageFile[y][x].red   = (png::byte)max(0.0, min(255.0, image[0][y][x]));
            imageFile[y][x].green = (png::byte)max(0.0, min(255.0, image[1][y][x]));
            imageFile[y][x].blue  = (png::byte)max(0.0, min(255.0, image[2][y][x]));
        }
    imageFile.write(filename);
}

Image applyFilter(Image &image, Matrix &filter) {
    int height       = image[0].size();
    int width        = image[0][0].size();
    int filterHeight = filter.size();
    int filterWidth  = filter[0].size();
    int newH = height - filterHeight + 1;
    int newW = width  - filterWidth  + 1;

    Image newImage(3, Matrix(newH, Array(newW, 0.0)));

    for (int d = 0; d < 3; d++)
        for (int i = 0; i < newH; i++)
            for (int j = 0; j < newW; j++) {
                double sum = 0.0;
                for (int h = i; h < i + filterHeight; h++)
                    for (int w = j; w < j + filterWidth; w++)
                        sum += filter[h-i][w-j] * image[d][h][w];
                newImage[d][i][j] = sum;
            }
    return newImage;
}

int main(int argc, char *argv[]) {
    if (argc < 3) {
        cerr << "Uso: " << argv[0] << " <input.png> <output.png>" << endl;
        return 1;
    }

    auto t1 = chrono::high_resolution_clock::now();

    Matrix filter = getSharpen();
    Image  image  = loadImage(argv[1]);

    auto tc1 = chrono::high_resolution_clock::now();
    Image newImage = applyFilter(image, filter);
    auto tc2 = chrono::high_resolution_clock::now();

    saveImage(newImage, string(argv[2]));

    auto t2 = chrono::high_resolution_clock::now();

    double compute = chrono::duration_cast<chrono::milliseconds>(tc2 - tc1).count() / 1000.0;
    double total   = chrono::duration_cast<chrono::milliseconds>(t2  - t1 ).count() / 1000.0;

    cout << "{\"compute_sec\":" << compute << ",\"total_sec\":" << total << "}" << endl;

    return 0;
}
