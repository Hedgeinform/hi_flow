# Copy alongside check_quality.py into an existing CMake project.
include_guard(GLOBAL)
find_package(Python3 REQUIRED COMPONENTS Interpreter)
set(CPP_CHECK_STAGE "1" CACHE STRING "Quality stage: 1, 2 or 3")
set(CPP_FORMAT_SCOPE "changed" CACHE STRING "Blocking format scope: changed or all")
set(CPP_TIDY_SCOPE "changed" CACHE STRING "Blocking clang-tidy scope: changed or all")
set(CPP_CHECK_BASE "" CACHE STRING "Base revision for changed-file checks")
set(CPP_TIDY_ERROR_CHECKS "" CACHE STRING "Comma-separated clang-tidy checks enabled for stage 3")
set(CPP_HIFLOW_ROOT "" CACHE PATH "Pinned HiFlow checkout")

function(hiflow_add_cpp_gates)
  cmake_parse_arguments(GATE "" "" "TARGETS;CTEST_ARGS" ${ARGN})
  if(GATE_UNPARSED_ARGUMENTS)
    message(FATAL_ERROR "Unknown hiflow_add_cpp_gates arguments: ${GATE_UNPARSED_ARGUMENTS}")
  endif()
  if(NOT CPP_HIFLOW_ROOT)
    message(FATAL_ERROR "Set CPP_HIFLOW_ROOT to the pinned HiFlow checkout")
  endif()
  set(runner "${CMAKE_CURRENT_FUNCTION_LIST_DIR}/check_quality.py")
  set(common --project-root "${CMAKE_SOURCE_DIR}" --build-dir "${CMAKE_BINARY_DIR}"
    --stage "${CPP_CHECK_STAGE}" --format-scope "${CPP_FORMAT_SCOPE}"
    --tidy-scope "${CPP_TIDY_SCOPE}" "--base=${CPP_CHECK_BASE}"
    "--tidy-errors=${CPP_TIDY_ERROR_CHECKS}" --hiflow-root "${CPP_HIFLOW_ROOT}")
  add_custom_target(gates
    COMMAND "${Python3_EXECUTABLE}" "${runner}" format ${common}
    COMMAND "${Python3_EXECUTABLE}" "${runner}" tidy ${common}
    COMMAND "${Python3_EXECUTABLE}" "${runner}" architecture ${common}
    COMMAND "${CMAKE_CTEST_COMMAND}" --output-on-failure ${GATE_CTEST_ARGS}
    DEPENDS ${GATE_TARGETS}
    WORKING_DIRECTORY "${CMAKE_BINARY_DIR}"
    USES_TERMINAL VERBATIM)
endfunction()
