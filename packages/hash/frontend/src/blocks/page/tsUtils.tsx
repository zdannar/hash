import {
  Block,
  blockComponentRequiresText,
  componentIdToUrl,
} from "@hashintel/hash-shared/blockMeta";
import {
  EntityStoreType,
  isBlockEntity,
} from "@hashintel/hash-shared/entityStore";
import { ViewConfig } from "@hashintel/hash-shared/prosemirror";
import { Node as ProsemirrorNode, Schema } from "prosemirror-model";
import { EditorView, NodeView } from "prosemirror-view";
import React from "react";
import { RemoteBlock } from "../../components/RemoteBlock/RemoteBlock";
import { EntityStoreContext } from "./EntityStoreContext";
import { ReplacePortal } from "./usePortals";

// @todo we need to type this such that we're certain we're passing through all
// the props required
const getRemoteBlockProps = (entity: EntityStoreType | null | undefined) => {
  if (entity) {
    if (!isBlockEntity(entity)) {
      throw new Error("Cannot prepare non-block entity for prosemirrior");
    }

    const childEntity = entity.properties.entity;

    return {
      accountId: childEntity.accountId,
      childEntityId: childEntity.entityId,
      properties: "properties" in childEntity ? childEntity.properties : {},
    };
  }

  return { properties: {} };
};

/**
 * This creates a node view which integrates between React and prosemirror for
 * each block
 *
 * @todo rename this
 */
export const createNodeViewFactory = (
  replacePortal: ReplacePortal
): NonNullable<ViewConfig>["createNodeView"] =>
  function createNodeView(
    componentId: string,
    componentSchema: Block["componentSchema"],
    sourceName: string
  ): new (...args: any[]) => NodeView {
    const editable = blockComponentRequiresText(componentSchema);

    const nodeView = class BlockWrapper implements NodeView {
      dom: HTMLDivElement = document.createElement("div");
      contentDOM: HTMLElement | undefined = undefined;

      private target = document.createElement("div");

      constructor(
        node: ProsemirrorNode,
        public view: EditorView<Schema>,
        public getPos: () => number
      ) {
        this.dom.setAttribute("data-dom", "true");

        if (editable) {
          this.contentDOM = document.createElement("div");
          this.contentDOM.setAttribute("data-contentDOM", "true");
          this.contentDOM.style.display = "none";
          this.dom.appendChild(this.contentDOM);
        }

        this.target.setAttribute("data-target", "true");

        this.dom.appendChild(this.target);

        this.update(node);
      }

      update(node: any) {
        if (node?.type.name === componentId) {
          replacePortal(
            this.target,
            this.target,
            <EntityStoreContext.Consumer>
              {(entityStore) => {
                const entityId = node.attrs.entityId;
                const entity = entityStore[entityId];
                const remoteBlockProps = getRemoteBlockProps(entity);

                const editableRef = editable
                  ? (editableNode: HTMLElement) => {
                      if (
                        this.contentDOM &&
                        editableNode &&
                        !editableNode.contains(this.contentDOM)
                      ) {
                        editableNode.appendChild(this.contentDOM);
                        this.contentDOM.style.display = "";
                      }
                    }
                  : undefined;

                const mappedUrl = componentIdToUrl(componentId);

                return (
                  <RemoteBlock
                    {...remoteBlockProps}
                    url={`${mappedUrl}/${sourceName}`}
                    editableRef={editableRef}
                  />
                );
              }}
            </EntityStoreContext.Consumer>
          );

          return true;
        } else {
          return false;
        }
      }

      destroy() {
        this.dom.remove();
        replacePortal(this.target, null, null);
      }

      // @todo type this
      stopEvent(evt: any) {
        if (evt.type === "dragstart") {
          evt.preventDefault();
        }

        return true;
      }

      ignoreMutation(evt: any) {
        return !(
          !evt.target ||
          (evt.target !== this.contentDOM &&
            this.contentDOM?.contains(evt.target))
        );
      }
    };

    // Attempt to improve debugging by giving the node view class a dynamic
    // name
    Object.defineProperty(nodeView, "name", { value: `${componentId}View` });

    return nodeView;
  };

export const collabEnabled =
  typeof window !== "undefined" && window.location.search.includes("collab");
