/*
 * Filtro Sharpen paralelizado con MPI
 * Layout de buffers: [fila][canal][columna]  →  row * 3 * width + d * width + col
 *
 * Salida stdout: JSON { compute_sec, total_sec, processes }
 */
#include <iostream>
#include <vector>
#include <assert.h>
#include <cmath>
#include <png++/png.hpp>
#include <string>
#include <chrono>
#include <mpi.h>

using namespace std;
typedef vector<double> Array;
typedef vector<Array>  Matrix;
typedef vector<Matrix> Image;

Matrix getSharpen() {
    return {{ 0,-1, 0},{-1, 5,-1},{ 0,-1, 0}};
}

Image loadImage(const char *filename) {
    png::image<png::rgb_pixel> img(filename);
    Image m(3, Matrix(img.get_height(), Array(img.get_width())));
    for (int h = 0; h < (int)img.get_height(); h++)
        for (int w = 0; w < (int)img.get_width(); w++) {
            m[0][h][w] = img[h][w].red;
            m[1][h][w] = img[h][w].green;
            m[2][h][w] = img[h][w].blue;
        }
    return m;
}

void saveImage(Image &image, const string &filename) {
    int height = image[0].size(), width = image[0][0].size();
    png::image<png::rgb_pixel> f(width, height);
    for (int y = 0; y < height; y++)
        for (int x = 0; x < width; x++) {
            f[y][x].red   = (png::byte)max(0.0,min(255.0,image[0][y][x]));
            f[y][x].green = (png::byte)max(0.0,min(255.0,image[1][y][x]));
            f[y][x].blue  = (png::byte)max(0.0,min(255.0,image[2][y][x]));
        }
    f.write(filename);
}

vector<double> imageToBuffer(Image &image, int rows, int width) {
    vector<double> buf(rows * 3 * width);
    for (int r=0;r<rows;r++) for (int d=0;d<3;d++) for (int c=0;c<width;c++)
        buf[r*3*width + d*width + c] = image[d][r][c];
    return buf;
}

Image bufferToImage(vector<double> &buf, int rows, int width) {
    Image img(3, Matrix(rows, Array(width, 0.0)));
    for (int r=0;r<rows;r++) for (int d=0;d<3;d++) for (int c=0;c<width;c++)
        img[d][r][c] = buf[r*3*width + d*width + c];
    return img;
}

Image applyFilter(Image &image, Matrix &filter) {
    int fH=filter.size(), fW=filter[0].size();
    int inR=image[0].size(), inW=image[0][0].size();
    int outR=inR-fH+1, outW=inW-fW+1;
    if (outR<=0||outW<=0) return Image(3,Matrix(0,Array(0)));
    Image res(3,Matrix(outR,Array(outW,0.0)));
    for (int d=0;d<3;d++) for (int i=0;i<outR;i++) for (int j=0;j<outW;j++) {
        double s=0;
        for (int fh=0;fh<fH;fh++) for (int fw=0;fw<fW;fw++)
            s+=filter[fh][fw]*image[d][i+fh][j+fw];
        res[d][i][j]=s;
    }
    return res;
}

int main(int argc, char *argv[]) {
    MPI_Init(&argc, &argv);
    int rank, size;
    MPI_Comm_rank(MPI_COMM_WORLD, &rank);
    MPI_Comm_size(MPI_COMM_WORLD, &size);

    if (argc < 3) {
        if (rank==0) cerr<<"Uso: mpirun -np N "<<argv[0]<<" <input.png> <output.png>"<<endl;
        MPI_Finalize(); return 1;
    }

    double t_total_start = MPI_Wtime();
    Matrix filter = getSharpen();
    int fH=filter.size(), fW=filter[0].size();
    int height=0, width=0;
    Image image;

    if (rank==0) {
        image  = loadImage(argv[1]);
        height = image[0].size();
        width  = image[0][0].size();
    }
    MPI_Bcast(&height,1,MPI_INT,0,MPI_COMM_WORLD);
    MPI_Bcast(&width, 1,MPI_INT,0,MPI_COMM_WORLD);

    int outHeight=height-fH+1, outWidth=width-fW+1;
    int baseRows=outHeight/size, remainder=outHeight%size;

    vector<int> pOutRows(size),pOutStart(size);
    for (int p=0;p<size;p++) {
        pOutRows[p]  = baseRows+(p<remainder?1:0);
        pOutStart[p] = (p==0)?0:pOutStart[p-1]+pOutRows[p-1];
    }
    vector<int> pInRows(size),pInStart(size);
    for (int p=0;p<size;p++) {
        pInStart[p] = pOutStart[p];
        pInRows[p]  = pOutRows[p]+fH-1;
        if (pInStart[p]+pInRows[p]>height) pInRows[p]=height-pInStart[p];
    }

    int myInRows = pInRows[rank];
    vector<double> localBuf(myInRows*3*width, 0.0);

    if (rank==0) {
        for (int r=0;r<pInRows[0];r++) for (int d=0;d<3;d++) for (int c=0;c<width;c++)
            localBuf[r*3*width+d*width+c] = image[d][pInStart[0]+r][c];
        for (int p=1;p<size;p++) {
            int sz=pInRows[p]*3*width;
            vector<double> sb(sz);
            for (int r=0;r<pInRows[p];r++) for (int d=0;d<3;d++) for (int c=0;c<width;c++)
                sb[r*3*width+d*width+c] = image[d][pInStart[p]+r][c];
            MPI_Send(sb.data(),sz,MPI_DOUBLE,p,0,MPI_COMM_WORLD);
        }
    } else {
        MPI_Recv(localBuf.data(),myInRows*3*width,MPI_DOUBLE,0,0,MPI_COMM_WORLD,MPI_STATUS_IGNORE);
    }

    Image localImage = bufferToImage(localBuf, myInRows, width);

    double tc1 = MPI_Wtime();
    Image localResult = applyFilter(localImage, filter);
    double tc2 = MPI_Wtime();

    int myOutRows = (int)localResult[0].size();
    int localResultSize = myOutRows*3*outWidth;
    vector<double> resultBuf(localResultSize);
    for (int r=0;r<myOutRows;r++) for (int d=0;d<3;d++) for (int c=0;c<outWidth;c++)
        resultBuf[r*3*outWidth+d*outWidth+c] = localResult[d][r][c];

    vector<int> recvCounts(size),displs(size);
    for (int p=0;p<size;p++) {
        recvCounts[p]=pOutRows[p]*3*outWidth;
        displs[p]=(p==0)?0:displs[p-1]+recvCounts[p-1];
    }
    vector<double> globalBuf;
    if (rank==0) globalBuf.resize(outHeight*3*outWidth);

    MPI_Gatherv(resultBuf.data(),localResultSize,MPI_DOUBLE,
                globalBuf.data(),recvCounts.data(),displs.data(),MPI_DOUBLE,
                0,MPI_COMM_WORLD);

    if (rank==0) {
        Image newImage = bufferToImage(globalBuf, outHeight, outWidth);
        saveImage(newImage, string(argv[2]));
        double total = MPI_Wtime() - t_total_start;
        double compute = tc2 - tc1;
        cout << "{\"compute_sec\":" << compute << ",\"total_sec\":" << total
             << ",\"processes\":" << size << "}" << endl;
    }

    MPI_Finalize();
    return 0;
}
