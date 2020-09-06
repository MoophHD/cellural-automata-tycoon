import React, {
  useState,
  useEffect,
  useReducer,
  useCallback,
  useRef,
} from "react";
import styled from "styled-components";
import PlayArea from "./PlayArea";
import Tools from "./Tools";
import { produce } from "immer";
import { getNextGrid, generateEmptyGrid } from "./gridFunctions";
import { HTML5Backend } from "react-dnd-html5-backend";
import { DndProvider } from "react-dnd";

const MAX_HISTORY_STORAGE = 10;
/*
History model:
{ date: new window.Date().toISOString(), step: 1, grid: `` },
*/
const initialState = {
  grid: generateEmptyGrid(20, 20),
  step: 0,
  rows: 20,
  cols: 20,
  interval: 650,
  // hashes/ids for history?
  history: [],
};

function reducer(state, action) {
  const { grid, step, history } = state;

  switch (action.type) {
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
      console.log(`next Step ${nextStep}`);
      let nextStepHistory = history.find((el) => el.step === nextStep);
      console.log(nextStepHistory);
      if (nextStepHistory) {
        console.log(`next step found`);
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

const Home = ({ navbar }) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [running, setRunning] = useState(false);
  //lord forgive me
  const [cellSide, setCellSide] = useState(10);

  const { interval, history, step, grid } = state;

  const runningRef = useRef(running);
  runningRef.current = running;

  const intervalRef = useRef(interval);
  intervalRef.current = interval;

  useEffect(() => {
    // TODO: Fetch grid from db
  }, []);

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
        />
      </Container>
    </DndProvider>
  );
};

const Container = styled.div`
  display: grid;
  grid-template-columns: 2fr minmax(min-content, 1fr);
  height: 100%;
  width: 100vw;
`;

export default Home;
