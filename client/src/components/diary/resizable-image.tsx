"use client";

import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import Image from "@tiptap/extension-image";
import { useCallback, useEffect, useRef, useState } from "react";

// Extension that uses the React component
export const ResizableImageExtension = Image.extend({
    addAttributes() {
        return {
            ...this.parent?.(),
            src: {
                default: null,
                parseHTML: (element) => element.getAttribute("src"),
                renderHTML: (attributes) => {
                    return {
                        src: attributes.src,
                    };
                },
            },
            alt: {
                default: null,
                parseHTML: (element) => element.getAttribute("alt"),
            },
            title: {
                default: null,
                parseHTML: (element) => element.getAttribute("title"),
            },
            width: {
                default: "100%",
                parseHTML: (element) => element.getAttribute("width") || element.style.width || "100%",
                renderHTML: (attributes) => {
                    return {
                        width: attributes.width,
                    };
                },
            },
            height: {
                default: "auto",
                parseHTML: (element) => element.getAttribute("height") || element.style.height || "auto",
            },
        };
    },
    parseHTML() {
        return [
            {
                tag: "img[src]",
            },
        ];
    },
    addNodeView() {
        return ReactNodeViewRenderer(ResizableImage);
    },
});

// The React Component for the Node View
const ResizableImage = ({ node, updateAttributes, selected }: any) => {
    const [width, setWidth] = useState(node.attrs.width);
    const [isResizing, setIsResizing] = useState(false);
    const imageRef = useRef<HTMLImageElement>(null);
    const resizeRef = useRef<HTMLDivElement>(null);

    // Update local state when node attributes change
    useEffect(() => {
        setWidth(node.attrs.width);
    }, [node.attrs.width]);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault(); // Prevent text selection
        setIsResizing(true);
        
        const startX = e.pageX;
        const startWidth = imageRef.current?.offsetWidth || 0;

        const handleMouseMove = (e: MouseEvent) => {
            const currentX = e.pageX;
            const diffX = currentX - startX;
            const newWidth = Math.max(100, startWidth + diffX); // Min width 100px
            
            setWidth(`${newWidth}px`);
        };

        const handleMouseUp = () => {
            setIsResizing(false);
            if (imageRef.current) {
                 updateAttributes({ width: `${imageRef.current.offsetWidth}px` });
            }
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
        };

        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
    }, [updateAttributes]);

    return (
        <NodeViewWrapper className="relative inline-block leading-none">
            <div className={`relative inline-block ${selected ? 'ring-2 ring-primary ring-offset-2' : ''}`}>
                <img
                    ref={imageRef}
                    src={node.attrs.src}
                    alt={node.attrs.alt}
                    title={node.attrs.title}
                    style={{ 
                        width: width, 
                        height: 'auto', 
                        maxWidth: '100%',
                        transition: isResizing ? 'none' : 'width 0.2s'
                    }}
                    className="rounded-md border border-border"
                />
                
                {/* Resize Handle */}
                <div
                    ref={resizeRef}
                    onMouseDown={handleMouseDown}
                    className="absolute bottom-2 right-2 w-4 h-4 bg-primary rounded-full cursor-ew-resize border-2 border-white shadow-sm hover:scale-110 transition-transform z-10 opacity-0 hover:opacity-100 group-hover:opacity-100"
                    style={{ opacity: selected || isResizing ? 1 : 0 }}
                />
            </div>
        </NodeViewWrapper>
    );
};
