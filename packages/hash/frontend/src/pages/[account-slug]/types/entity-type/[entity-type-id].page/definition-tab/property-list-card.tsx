import { PropertyType, VersionedUri } from "@blockprotocol/type-system";
import { faList } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@hashintel/hash-design-system";
import {
  Checkbox,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
} from "@mui/material";
import { bindTrigger, usePopupState } from "material-ui-popup-state/hooks";
import { useId, useLayoutEffect, useRef, useState } from "react";
import {
  Controller,
  useFieldArray,
  useFormContext,
  useWatch,
} from "react-hook-form";
import { useBlockProtocolCreatePropertyType } from "../../../../../../components/hooks/blockProtocolFunctions/ontology/useBlockProtocolCreatePropertyType";
import { useBlockProtocolUpdatePropertyType } from "../../../../../../components/hooks/blockProtocolFunctions/ontology/useBlockProtocolUpdatePropertyType";
import { StyledPlusCircleIcon } from "../../../../shared/styled-plus-circle-icon";
import { useRouteNamespace } from "../../../../shared/use-route-namespace";
import { EntityTypeEditorForm } from "../shared/form-types";
import {
  usePropertyTypes,
  useRefetchPropertyTypes,
} from "../shared/property-types-context";
import { MultipleValuesCell } from "./property-list-card/multiple-values-cell";
import { PropertyExpectedValues } from "./property-list-card/property-expected-values";
import { TYPE_MENU_CELL_WIDTH, TypeMenuCell } from "./shared/type-menu-cell";
import {
  formDataToPropertyType,
  PropertyTypeForm,
} from "./property-list-card/shared/property-type-form";
import { PropertyTypeFormValues } from "./property-list-card/shared/property-type-form-values";
import { EmptyListCard } from "./shared/empty-list-card";
import {
  EntityTypeTable,
  EntityTypeTableButtonRow,
  EntityTypeTableCenteredCell,
  EntityTypeTableHeaderRow,
  EntityTypeTableRow,
  EntityTypeTableTitleCellText,
} from "./shared/entity-type-table";
import { InsertTypeRow, InsertTypeRowProps } from "./shared/insert-type-row";
import { QuestionIcon } from "./shared/question-icon";
import { useStateCallback } from "./shared/use-state-callback";

export const PropertyTypeRow = ({
  propertyIndex,
  onRemove,
  onUpdatePropertyTypeVersion,
}: {
  propertyIndex: number;
  onRemove: () => void;
  onUpdatePropertyTypeVersion: (nextId: VersionedUri) => void;
}) => {
  const { control } = useFormContext<EntityTypeEditorForm>();

  const [$id] = useWatch({
    control,
    name: [`properties.${propertyIndex}.$id`],
  });

  const popupId = useId();
  const menuPopupState = usePopupState({
    variant: "popover",
    popupId: `property-menu-${popupId}`,
  });

  const editModalId = useId();
  const editModalPopupState = usePopupState({
    variant: "popover",
    popupId: `edit-property-type-modal-${editModalId}`,
  });

  const { updatePropertyType } = useBlockProtocolUpdatePropertyType();
  const refetchPropertyTypes = useRefetchPropertyTypes();

  const propertyTypes = usePropertyTypes();
  const property = propertyTypes?.[$id];

  const onUpdatePropertyTypeVersionRef = useRef(onUpdatePropertyTypeVersion);
  useLayoutEffect(() => {
    onUpdatePropertyTypeVersionRef.current = onUpdatePropertyTypeVersion;
  });

  if (!property) {
    if (propertyTypes) {
      throw new Error("Missing property type");
    }

    return null;
  }

  return (
    <>
      <EntityTypeTableRow>
        <TableCell>
          <EntityTypeTableTitleCellText>
            {property.title}
          </EntityTypeTableTitleCellText>
        </TableCell>
        <TableCell>
          <PropertyExpectedValues property={property} />
        </TableCell>

        <MultipleValuesCell propertyIndex={propertyIndex} />

        <EntityTypeTableCenteredCell>
          <Controller
            render={({ field: { value, ...field } }) => (
              <Checkbox {...field} checked={value} />
            )}
            control={control}
            name={`properties.${propertyIndex}.required`}
          />
        </EntityTypeTableCenteredCell>

        <TypeMenuCell
          editButtonProps={bindTrigger(editModalPopupState)}
          onRemove={onRemove}
          typeId={property.$id}
          popupState={menuPopupState}
          variant="property"
        />
      </EntityTypeTableRow>
      <PropertyTypeForm
        popupState={editModalPopupState}
        modalTitle={<>Edit Property Type</>}
        onSubmit={async (data) => {
          // @todo verify this works
          const res = await updatePropertyType({
            data: {
              propertyTypeId: $id,
              propertyType: formDataToPropertyType(data),
            },
          });

          if (!res.data) {
            throw new Error("Failed to update property type");
          }

          await refetchPropertyTypes?.();

          onUpdatePropertyTypeVersionRef.current(
            // @todo temporary bug fix
            res.data.schema.$id.replace("//v", "/v") as VersionedUri,
          );

          editModalPopupState.close();
        }}
        submitButtonProps={{ children: <>Edit property type</> }}
        fieldProps={{ name: { disabled: true } }}
        getDefaultValues={() => ({
          name: property.title,
          description: property.description,
          // @todo handle exotic values
          expectedValues: property.oneOf.map((dataType) => {
            if (!("$ref" in dataType)) {
              throw new Error("Handle exotic data types");
            }
            return dataType.$ref;
          }),
        })}
      />
    </>
  );
};

const InsertPropertyRow = (
  props: Omit<InsertTypeRowProps<PropertyType>, "options" | "variant">,
) => {
  const { control } = useFormContext<EntityTypeEditorForm>();
  const properties = useWatch({ control, name: "properties" });

  const propertyTypesObj = usePropertyTypes();
  const propertyTypes = Object.values(propertyTypesObj ?? {});

  // @todo make more efficient
  const filteredPropertyTypes = propertyTypes.filter(
    (type) =>
      !properties.some((includedProperty) => includedProperty.$id === type.$id),
  );

  return (
    <InsertTypeRow
      {...props}
      options={filteredPropertyTypes}
      variant="property"
    />
  );
};

export const PropertyListCard = () => {
  const { control, getValues, setValue } =
    useFormContext<EntityTypeEditorForm>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "properties",
  });

  const [addingNewProperty, setAddingNewProperty] = useStateCallback(false);
  const [searchText, setSearchText] = useState("");
  const addingNewPropertyRef = useRef<HTMLInputElement>(null);

  const cancelAddingNewProperty = () => {
    setAddingNewProperty(false);
    setSearchText("");
  };

  const { routeNamespace } = useRouteNamespace();
  const { createPropertyType } = useBlockProtocolCreatePropertyType(
    routeNamespace?.accountId ?? "",
  );

  const refetchPropertyTypes = useRefetchPropertyTypes();
  const modalTooltipId = useId();
  const createModalPopupState = usePopupState({
    variant: "popover",
    popupId: `createProperty-${modalTooltipId}`,
  });

  const handleAddPropertyType = (propertyType: PropertyType) => {
    cancelAddingNewProperty();
    if (!getValues("properties").some(({ $id }) => $id === propertyType.$id)) {
      append({
        $id: propertyType.$id,
        required: false,
        array: false,
        minValue: 0,
        maxValue: 1,
        infinity: true,
      });
    }
  };

  const handleSubmit = async (data: PropertyTypeFormValues) => {
    const res = await createPropertyType({
      data: {
        propertyType: formDataToPropertyType(data),
      },
    });

    if (res.errors?.length || !res.data) {
      // @todo handle this
      throw new Error("Could not create");
    }

    await refetchPropertyTypes?.();

    handleAddPropertyType(res.data.schema);
  };

  if (!addingNewProperty && fields.length === 0) {
    return (
      <EmptyListCard
        onClick={() => {
          setAddingNewProperty(true, () => {
            addingNewPropertyRef.current?.focus();
          });
        }}
        icon={<FontAwesomeIcon icon={faList} />}
        headline={<>Add a property</>}
        description={
          <>
            Properties store individual pieces of information about some aspect
            of an entity
          </>
        }
        subDescription={
          <>
            e.g. a <strong>person</strong> entity might have a{" "}
            <strong>date of birth</strong> property which expects a{" "}
            <strong>date</strong>
          </>
        }
      />
    );
  }

  return (
    <EntityTypeTable>
      <TableHead>
        <EntityTypeTableHeaderRow>
          <TableCell>Property name</TableCell>
          <TableCell width={180}>Expected values</TableCell>
          <EntityTypeTableCenteredCell width={170}>
            Allow multiple values <QuestionIcon />
          </EntityTypeTableCenteredCell>
          <EntityTypeTableCenteredCell width={100}>
            Required
          </EntityTypeTableCenteredCell>
          <TableCell width={TYPE_MENU_CELL_WIDTH} />
        </EntityTypeTableHeaderRow>
      </TableHead>
      <TableBody>
        {fields.map((type, index) => (
          <PropertyTypeRow
            key={type.id}
            propertyIndex={index}
            onRemove={() => {
              remove(index);
            }}
            onUpdatePropertyTypeVersion={(nextId) => {
              setValue(`properties.${index}.$id`, nextId, {
                shouldDirty: true,
              });
            }}
          />
        ))}
      </TableBody>
      <TableFooter>
        {addingNewProperty ? (
          <>
            <InsertPropertyRow
              inputRef={addingNewPropertyRef}
              onCancel={cancelAddingNewProperty}
              onAdd={handleAddPropertyType}
              createModalPopupState={createModalPopupState}
              searchText={searchText}
              onSearchTextChange={setSearchText}
            />
            <PropertyTypeForm
              modalTitle={
                <>
                  Create new property type
                  <QuestionIcon
                    sx={{
                      ml: 1.25,
                    }}
                  />
                </>
              }
              popupState={createModalPopupState}
              onSubmit={handleSubmit}
              submitButtonProps={{ children: <>Create new property type</> }}
              getDefaultValues={() =>
                searchText.length ? { name: searchText } : {}
              }
            />
          </>
        ) : (
          <EntityTypeTableButtonRow
            icon={<StyledPlusCircleIcon />}
            onClick={() => {
              setAddingNewProperty(true, () => {
                addingNewPropertyRef.current?.focus();
              });
            }}
          >
            Add a property
          </EntityTypeTableButtonRow>
        )}
      </TableFooter>
    </EntityTypeTable>
  );
};
