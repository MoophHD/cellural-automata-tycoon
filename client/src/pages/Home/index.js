import React, {
  useState,
  useEffect,
  useReducer,
  useCallback,
  useRef,
  useContext,
} from "react";
import styled from "styled-components";
import PlayArea from "./PlayArea";
import Tools from "./Tools";
import { produce } from "immer";
import { getNextGrid, generateEmptyGrid } from "./misc/gridFunctions";
import { HTML5Backend } from "react-dnd-html5-backend";
import { DndProvider } from "react-dnd";
import { patterns } from "./misc/patterns";
import AuthContext from "../../context/auth.context";
import { useHttp } from "../../hooks/http.hook";
import { useHistory } from "react-router-dom";

const MAX_HISTORY_STORAGE = 30;
const STEPS_TO_UPDATE = 5;
const ROWS = 20;
const COLS = 20;
const initialState = {
  grid: generateEmptyGrid(ROWS, COLS),
  step: 0,
  rows: ROWS,
  cols: COLS,
  interval: 650,
  history: [],
};

function reducer(state, action) {
  const { grid, step, history } = state;

  switch (action.type) {
    case "load": {
      const { grid, step } = action.payload;
    
      return { ...state, grid, step };
    }
    case "toggle-cell": {
      const { x, y } = action.payload;
      return {
        ...state,
        grid: produce(grid, (gridCopy) => {
          gridCopy[x][y] = gridCopy[x][y] === 1 ? 0 : 1;
        }),
      };
    }
    case "set-from-history": {
      const { step } = action.payload;
      const historyElement = history.find((el) => el.step === step);

      if (history) {
        return { ...state, step, grid: JSON.parse(historyElement.grid) };
      } else {
        return state;
      }
    }
    case "step-in": {
      const nextStep = step + 1;
      let nextStepHistory = history.find((el) => el.step === nextStep);
      if (nextStepHistory) {
        // grab already existing grid
        return {
          ...state,
          grid: JSON.parse(nextStepHistory.grid),
          step: nextStep,
        };
      } else {
        let nextGrid = getNextGrid(grid);
        let nextHistory = produce(history, (historyCopy) => {
          // replace with shift/unshift when the internet is up
          if (historyCopy.length >= MAX_HISTORY_STORAGE) historyCopy.shift();
          historyCopy.push({
            date: new window.Date().toISOString(),
            grid: JSON.stringify(grid),
            step: nextStep,
          });
        });

        return {
          ...state,
          grid: nextGrid,
          step: nextStep,
          history: nextHistory,
        };
      }
    }
    case "step-out": {
      const prevStep = step - 1;

      if (prevStep < 0) return state;

      const prevHistory = history.find((el) => el.step === prevStep);
      const prevGrid = JSON.parse(prevHistory.grid);

      return { ...state, step: prevStep, grid: prevGrid };
    }
    case "set-rows":
      const newRows = action.payload;
      return {
        ...state,
        grid: generateEmptyGrid(newRows, state.cols),
        rows: newRows,
      };
    case "set-cols":
      const newCols = action.payload;
      return {
        ...state,
        grid: generateEmptyGrid(state.rows, newCols),
        cols: newCols,
      };
    case "set-interval":
      return {
        ...state,
        interval: action.payload,
      };
    case "put-pattern": {
      let { x, y, pattern } = action.payload;
      const patternWidth = pattern[0].length;
      const patternHeight = pattern.length;
      return {
        ...state,
        grid: produce(grid, (gridCopy) => {
          gridCopy.forEach((row, i) => {
            row.forEach((col, j) => {
              if (
                i >= y &&
                i < y + patternHeight &&
                j >= x &&
                j < x + patternWidth
              ) {
                if (pattern[i - y][j - x] === 1) gridCopy[i][j] = 1;
              }
            });
          });
        }),
      };
    }
    default:
      return state;
  }
}

const Home = ({ match }) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [running, setRunning] = useState(false);
  const [cellSide, setCellSide] = useState(10);
  const { isAuthentificated } = useContext(AuthContext);
  const { request } = useHttp();
  const domHistory = useHistory();

  const { interval, history, step, grid, rows, cols } = state;

  const runningRef = useRef(running);
  runningRef.current = running;

  const intervalRef = useRef(interval);
  intervalRef.current = interval;

  useEffect(() => {
    if (!match.params.id) return;

    const fetchData = async () => {
      const data = await request(`/api/grid/${match.params.id}`, "GET");

      const { grid, step } = data;
      onLoad(JSON.parse(grid), step);
    };
    fetchData();
  }, [match.params.id, request]);

  useEffect(() => {
    if (step === 0 || !isAuthentificated) return;

    if (match.params.id && step % STEPS_TO_UPDATE === 0) {
      const updateGrid = async () => {
        await request("/api/grid/update", "POST", {
          grid: JSON.stringify(grid),
          step,
          id: match.params.id
        });
      };

      updateGrid();
    } else if (!match.params.id) {
      const setGrid = async () => {
        const data = await request("/api/grid/generate", "POST", {
          grid: JSON.stringify(grid),
          step,
        });
        domHistory.push(`/${data.grid.id}`);
      };

      setGrid();
    }
  }, [step, domHistory, grid, isAuthentificated, match.params.id, request]);

  const onLoad = (grid, step) => {
    dispatch({ type: "load", payload: { grid, step } });
  };

  const onStepIn = () => {
    dispatch({ type: "step-in" });
  };

  const onStepOut = () => {
    dispatch({ type: "step-out" });
  };

  const onToggleCell = (x, y) => {
    dispatch({ type: "toggle-cell", payload: { x, y } });
  };

  const onSetRows = (rows) => {
    dispatch({ type: "set-rows", payload: rows });
  };

  const onSetCols = (cols) => {
    dispatch({ type: "set-cols", payload: cols });
  };

  const onSetInterval = (interval) => {
    dispatch({ type: "set-interval", payload: interval });
  };

  const runSimulation = useCallback(() => {
    if (!runningRef.current) return;

    onStepIn();

    setTimeout(runSimulation, intervalRef.current);
  }, []);

  const toggleRunning = () => {
    setRunning(!running);
    runningRef.current = !running;

    runSimulation();
  };

  const onPutPattern = (x, y, pattern) => {
    dispatch({ type: "put-pattern", payload: { x, y, pattern } });
  };

  const onSetFromHistory = (step) => {
    dispatch({ type: "set-from-history", payload: { step } });
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <Container>
        <PlayArea
          step={step}
          grid={grid}
          running={running}
          onPutPattern={onPutPattern}
          setCellSide={(cellSide) => setCellSide(cellSide)}
          onToggleCell={onToggleCell}
        />
        <Tools
          step={step}
          history={history}
          onSetFromHistory={onSetFromHistory}
          onSetRows={onSetRows}
          onSetCols={onSetCols}
          onStepIn={onStepIn}
          onStepOut={onStepOut}
          onSetInterval={onSetInterval}
          interval={interval}
          running={running}
          onTogglePlay={toggleRunning}
          cellSide={cellSide}
          patterns={patterns}
          rows={rows}
          cols={cols}
        />
      </Container>
    </DndProvider>
  );
};

const Container = styled.div`
  display: grid;
  grid-template-columns: 2fr minmax(min-content, 1fr);
  height: 100%;
  width: 100%;

  @media (max-width: 800px) {
    grid-template-columns: none;
    grid-template-rows: 2fr minmax(min-content, 1fr);
  }
`;

export default Home;
