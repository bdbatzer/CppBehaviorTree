cmake_minimum_required(VERSION 3.28.4)
project(BT_APP)

set(CMAKE_EXPORT_COMPILE_COMMANDS ON)
set(CMAKE_CXX_STANDARD 20)

add_executable(BT_APP Main.cpp)
target_include_directories(BT_APP PUBLIC ./)