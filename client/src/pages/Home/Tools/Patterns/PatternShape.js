import React, { useRef, useState } from "react";
import { DragPreviewImage, useDrag } from "react-dnd";
import styled from "styled-components";
import { useEffect } from "react";

const space = 4;
const PatternShape = ({ globalCellSide, pattern, name }) => {
  const patternRef = useRef(null);
  const [cellSide, setCellSide] = useState(1);
  const [previewSrc, setPreviewSrc] = useState("");
  const [rect, setRect] = useState({ height: 1, width: 1 });
  const cols = pattern[0].length;
  const rows = pattern.length;
  const [, drag, preview] = useDrag({
    item: { type: "Pattern", ref: patternRef },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
    begin: (monitor) => {
      const rect = patternRef.current.getBoundingClientRect();
      const monitorOffset = monitor.getClientOffset();

      const pickOffset = {
        x: rect.x - monitorOffset.x,
        y: rect.y - monitorOffset.y,
      };

      return { type: "Pattern", ref: patternRef, pickOffset, pattern };
    },
  });

  // set cell side
  useEffect(() => {
    const rect = patternRef.current.getBoundingClientRect();

    const { width, height } = rect;
    setRect(rect);

    let cellSide;
    // cell side is determined by the smallest ratio
    if (width / cols >= height / rows) {
      cellSide = (width - space * (cols - 1)) / cols;
    } else {
      cellSide = (height - space * (rows - 1)) / rows;
    }
    setCellSide(cellSide);
  }, [patternRef, cols, rows]);

  // handle draggable preview
  useEffect(() => {
    const clone = patternRef.current.cloneNode(true);
    let scaleCoef = globalCellSide / cellSide;

    if (scaleCoef > 0) {
      clone.setAttribute("height", rect.height * scaleCoef);
      clone.setAttribute("width", rect.width * scaleCoef);
    }
    const nodes = clone.childNodes;
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].style.fill !== "none") nodes[i].style.fill = "#FC2323";
    }

    const string = new XMLSerializer().serializeToString(clone);
    // converts dom to base64
    var encoded = window.btoa(string);
    setPreviewSrc("data:image/svg+xml;base64," + encoded);
  }, [patternRef, rect, globalCellSide, cellSide]);
  return (
    <>
      <Img preview={preview} previewSrc={previewSrc} />
      <ShapeContainer ref={drag}>
        <svg
          viewBox={`0 0 ${rect.width} ${rect.height} `}
          style={{
            height: Math.min(rows / cols, 1) * 4.5 + "rem",
            width: Math.min(cols / rows, 1) * 4.5 + "rem",
          }}
          height={rect.height}
          width={rect.width}
          ref={patternRef}
          cols={cols}
          rows={rows}
        >
          {pattern.map((row, i) =>
            row.map((num, j) => (
              <rect
                x={j * (cellSide + space)}
                y={i * (cellSide + space)}
                height={cellSide}
                width={cellSide}
                rx={8}
                ry={8}
                key={`${i}col ${j} row pattern cel`}
                style={{ fill: !!num ? "#DADADA" : "none" }}
              />
            ))
          )}
        </svg>
        <Name>{name}</Name>
      </ShapeContainer>
    </>
  );
};

const Img = React.memo(({ preview, previewSrc }) => {
  return <DragPreviewImage connect={preview} src={previewSrc} />;
});

export default PatternShape;

const ShapeContainer = styled.div`
  //wtf?, fixed untranparent background
  transform: translate(0, 0);
  cursor: pointer;
  background-color: white;
  padding: 2rem 1.65rem 1rem;
  box-shadow: 0px 4px 0px #aeaeae;
  border-radius: 1.25rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  margin: 0.5rem;
  height: 10rem;
`;

const Name = styled.span`
  text-transform: uppercase;
  font-weight: bold;
`;
