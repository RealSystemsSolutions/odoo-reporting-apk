import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Switch,
} from "react-native";
import { toast } from "@/store/toast.store";
import Text from "@/components/ui/Text";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme/ThemeContext";
import { useProductsStore } from "@/store/products.store";
import { OdooProductService } from "@/services/odoo.service";
import { OdooProduct, OdooProductCategory } from "@/types/odoo.types";
import ScannerModal from "@/components/ScannerModal";
import CategorySelectorModal from "@/components/CategorySelectorModal";
import ProductSelectorModal from "@/components/ProductSelectorModal";

export default function ProductDetailsScreen() {
  const { id, productData, barcode } = useLocalSearchParams<{
    id: string;
    productData?: string;
    barcode?: string;
  }>();
  const isNew = id === "new";
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const { createProduct, updateProduct, archiveProduct, error } =
    useProductsStore();

  const [isLoading, setIsLoading] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [qtyAvailable, setQtyAvailable] = useState(0);
  const [originalQty, setOriginalQty] = useState(0);
  const [variantId, setVariantId] = useState<number | null>(null);
  const [originalType, setOriginalType] = useState<{
    type: string;
    is_storable: boolean;
  }>({ type: "consu", is_storable: true });

  const [formData, setFormData] = useState<Partial<OdooProduct>>({
    name: "",
    default_code: "",
    barcode: "",
    list_price: 0,
    standard_price: 0,
    type: "consu",
    is_storable: true,
    categ_id: false,
    sale_ok: true,
    purchase_ok: true,
    active: true,

    // Restricciones
    food_stamp: false,
    wic: false,
    fsa: false,
    age_verification: false,

    // Precios / Balanza
    scalable: false,
    open_price: false,
    rollup_pricing: false,
    prefix_price: false,
    wt_format: false,
    mix_and_match: false,

    // Cocina / Impresion
    is_kitchen: false,
    office_copy: false,
    print1: false,
    print2: false,
    print3: false,
    print4: false,

    // Promociones y Modificadores
    promotion_description: "",
    promotion_qty: 0,
    promotion_price: 0,
    modifier_1: "",
    modifier_2: "",
    modifier_3: "",

    // POS Atributos
    visible: true,
    taxable: true,
    tax_amount: 0,
    follow_department: true,
    family_code: false,
    margin: 0,
    alert_quantity: 0,
    group_id: "",
    size: "",
    brand: "",
    label: "",
    label_description: "",
    sibling_item: false,
  });

  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [productModalVisible, setProductModalVisible] = useState(false);

  const [computedData, setComputedData] = useState<{
    qty_available: number;
    virtual_available: number;
    product_variant_count: number;
    image_128: string | false;
    categ_name: string;
  }>({
    qty_available: 0,
    virtual_available: 0,
    product_variant_count: 0,
    image_128: false,
    categ_name: "",
  });

  useEffect(() => {
    if (!isNew && productData) {
      try {
        const product: OdooProduct = JSON.parse(productData);

        setFormData({
          name: product.name,
          default_code: product.default_code || "",
          barcode: product.barcode || "",
          list_price: product.list_price || 0,
          standard_price: product.standard_price || 0,
          type: product.type || "consu",
          is_storable: product.is_storable || false,
          categ_id: product.categ_id || false,

          food_stamp: product.food_stamp || false,
          wic: product.wic || false,
          fsa: product.fsa || false,
          age_verification: product.age_verification || false,

          scalable: product.scalable || false,
          open_price: product.open_price || false,
          rollup_pricing: product.rollup_pricing || false,
          prefix_price: product.prefix_price || false,
          wt_format: product.wt_format || false,
          mix_and_match: product.mix_and_match || false,

          is_kitchen: product.is_kitchen || false,
          office_copy: product.office_copy || false,
          print1: product.print1 || false,
          print2: product.print2 || false,
          print3: product.print3 || false,
          print4: product.print4 || false,

          // Promociones
          promotion_description: product.promotion_description || "",
          promotion_qty: product.promotion_qty || 0,
          promotion_price: product.promotion_price || 0,
          modifier_1: product.modifier_1 || "",
          modifier_2: product.modifier_2 || "",
          modifier_3: product.modifier_3 || "",

          taxable: product.taxable !== undefined ? product.taxable : true,
          tax_amount: product.tax_amount || 0,
          visible: product.visible !== undefined ? product.visible : true,
          follow_department:
            product.follow_department !== undefined
              ? product.follow_department
              : true,
          family_code: product.family_code || false,
          margin: product.margin || 0,
          alert_quantity: product.alert_quantity || 0,
          group_id: product.group_id || "",
          size: product.size || "",
          brand: product.brand || "",
          label: product.label || "",
          label_description: product.label_description || "",
          sibling_item: product.sibling_item || false,
          sale_ok: product.sale_ok !== undefined ? product.sale_ok : true,
          purchase_ok:
            product.purchase_ok !== undefined ? product.purchase_ok : true,
          active: product.active !== undefined ? product.active : true,
        });
        setComputedData({
          qty_available: product.qty_available || 0,
          virtual_available:
            product.virtual_available ?? product.qty_available ?? 0,
          product_variant_count: product.product_variant_count || 0,
          image_128: product.image_128 || false,
          categ_name: product.categ_id ? product.categ_id[1] : "N/A",
        });
        const qty = product.qty_available || 0;
        setQtyAvailable(qty);
        setOriginalQty(qty);
        if (
          product.product_variant_id &&
          Array.isArray(product.product_variant_id)
        ) {
          setVariantId(product.product_variant_id[0]);
        }
        setOriginalType({
          type: product.type || "consu",
          is_storable: product.is_storable ?? true,
        });

        // Fetch label fields from product.product (variant) since they only exist
        // there, not on product.template. Only fetch if label_needs_print is true
        // or we want to show last print info.

        if (
          product.product_variant_id &&
          Array.isArray(product.product_variant_id) &&
          product.product_variant_id[0]
        ) {
          (async () => {
            try {
              const variantData =
                await OdooProductService.getProductVariantById(
                  product.product_variant_id[0],
                );
              if (variantData) {
                setFormData((prev) => ({
                  ...prev,
                  print_label: variantData.print_label,
                  last_label_price: variantData.last_label_price,
                  last_label_date: variantData.last_label_date || undefined,
                }));
              }
            } catch (e) {
              console.warn("Error loading variant label data:", e);
            }
          })();
        }
      } catch (e) {
        console.error("Error parsing product data", e);
      }
    }
  }, [isNew, productData]);

  useEffect(() => {
    if (isNew && barcode) {
      setFormData((prev) => ({ ...prev, barcode }));
    }
  }, [isNew, barcode]);

  const handleChange = (field: keyof OdooProduct, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: [
        "list_price",
        "standard_price",
        "margin",
        "alert_quantity",
        "promotion_qty",
        "promotion_price",
        "tax_amount",
      ].includes(field)
        ? Number(value) || 0
        : value,
    }));
  };

  // Shared fields between product.template and product.category
  const DEPARTMENT_INHERITED_FIELDS: (keyof OdooProductCategory)[] = [
    "food_stamp",
    "wic",
    "fsa",
    "age_verification",
    "taxable",
    "scalable",
    "open_price",
    "mix_and_match",
    "prefix_price",
    "wt_format",
    "visible",
    "family_code",
    "print1",
    "print2",
    "print3",
    "print4",
    "margin",
  ];

  const [selectedCategoryData, setSelectedCategoryData] =
    useState<OdooProductCategory | null>(null);

  // Applies category values to the product for all shared fields
  const applyDepartmentInheritance = (category: OdooProductCategory) => {
    const updates: Partial<typeof formData> = {};
    DEPARTMENT_INHERITED_FIELDS.forEach((field) => {
      if (category[field] !== undefined) {
        (updates as any)[field] = category[field];
      }
    });
    if (Object.keys(updates).length > 0) {
      setFormData((prev) => ({ ...prev, ...updates }));
    }
  };

  // Re-apply when follow_department is toggled ON (using the last selected category)
  useEffect(() => {
    if (formData.follow_department && selectedCategoryData) {
      applyDepartmentInheritance(selectedCategoryData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.follow_department]);

  const handleSave = async () => {
    if (!formData.name) {
      toast.error("Product name is required");
      return;
    }

    setIsLoading(true);
    let success = false;

    // Clean empty strings to false for Odoo
    const submitData: any = { ...formData };
    delete submitData.tax_amount; // Exclude until confirmed
    delete submitData.margin; // Usually computed

    // Remove fields that only exist on product.product (variant), not on product.template
    delete submitData.print_label;
    delete submitData.last_label_price;
    delete submitData.last_label_date;

    // Ensure basic Odoo flags
    submitData.sale_ok = true;
    submitData.purchase_ok = true;

    if (submitData.default_code === "") submitData.default_code = false;
    if (submitData.barcode === "") submitData.barcode = false;

    // For existing products: only send type/is_storable when the user actually changed them.
    // Odoo fires @api.constrains('type','is_storable') whenever these fields appear in the
    // write dict — even with the same value — and that constraint rejects products with
    // negative stock ("Available quantity should be set to zero before changing inventory
    // tracking"). Omitting unchanged fields avoids the false positive.
    if (!isNew) {
      if (submitData.type === originalType.type) delete submitData.type;
      if (submitData.is_storable === originalType.is_storable)
        delete submitData.is_storable;
    }

    // Extract IDs from Many2one fields
    if (Array.isArray(submitData.categ_id)) {
      submitData.categ_id = submitData.categ_id[0];
    }
    if (Array.isArray(submitData.sibling_item)) {
      submitData.sibling_item = submitData.sibling_item[0];
    }

    if (isNew) {
      success = await createProduct(submitData);
    } else {
      success = await updateProduct(Number(id), submitData);
      if (success) {
        // Sync originals so future saves in the same session don't re-send unchanged fields
        if (formData.type !== undefined || formData.is_storable !== undefined) {
          setOriginalType({
            type: formData.type ?? originalType.type,
            is_storable: formData.is_storable ?? originalType.is_storable,
          });
        }
        if (variantId !== null && qtyAvailable !== originalQty) {
          try {
            await OdooProductService.adjustInventoryQty(
              variantId,
              qtyAvailable,
            );
            setOriginalQty(qtyAvailable);
          } catch (e) {
            toast.warning(
              "Product saved but inventory adjustment failed. Check permissions.",
            );
          }
        }
      }
    }

    setIsLoading(false);

    if (success) {
      toast.success("Product saved successfully");
      router.back();
    } else {
      toast.error(error || "There was a problem saving the product");
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Confirm Archive",
      "Are you sure you want to archive this product? (It will be hidden from active lists)",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Archive",
          style: "destructive",
          onPress: async () => {
            setIsLoading(true);
            const success = await archiveProduct(Number(id));
            setIsLoading(false);
            if (success) {
              toast.success("Product archived successfully");
              router.back();
            } else {
              toast.error("There was a problem archiving the product");
            }
          },
        },
      ],
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.card,
            borderBottomColor: colors.cardBorder,
            paddingTop: insets.top + 16,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="close" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          {isNew ? "New Product" : "Edit Product"}
        </Text>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={[styles.saveButtonText, { color: colors.primary }]}>
              Save
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 20 },
        ]}
      >
        {!isNew && (
          <View style={styles.imageContainer}>
            {computedData.image_128 ? (
              <Image
                source={{
                  uri: `data:image/png;base64,${computedData.image_128}`,
                }}
                style={styles.productImage}
              />
            ) : (
              <View
                style={[
                  styles.productImage,
                  styles.genericImageContainer,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.cardBorder,
                  },
                ]}
              >
                <Ionicons
                  name="image-outline"
                  size={48}
                  color={colors.primary}
                  style={{ opacity: 0.5 }}
                />
              </View>
            )}
          </View>
        )}

        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            Basic Information
          </Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>
              Product Name *
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.background,
                  color: colors.textPrimary,
                  borderColor: colors.cardBorder,
                },
              ]}
              value={formData.name}
              onChangeText={(text) => handleChange("name", text)}
              placeholder="e.g. Office Chair"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.switchRow}>
            <Text
              style={[styles.label, { color: colors.textPrimary, flex: 1 }]}
            >
              Visible in POS
            </Text>
            <Switch
              value={formData.visible}
              onValueChange={(val) => handleChange("visible", val)}
              trackColor={{ false: colors.cardBorder, true: colors.primary }}
            />
          </View>

          <View style={styles.switchRow}>
            <Text
              style={[styles.label, { color: colors.textPrimary, flex: 1 }]}
            >
              Follow Department
            </Text>
            <Switch
              value={formData.follow_department}
              onValueChange={(val) => handleChange("follow_department", val)}
              trackColor={{ false: colors.cardBorder, true: colors.primary }}
            />
          </View>

          <View style={styles.switchRow}>
            <Text
              style={[styles.label, { color: colors.textPrimary, flex: 1 }]}
            >
              Taxable
            </Text>
            <Switch
              value={formData.taxable}
              onValueChange={(val) => handleChange("taxable", val)}
              trackColor={{ false: colors.cardBorder, true: colors.primary }}
            />
          </View>

          {formData.taxable && (
            <View
              style={[styles.inputGroup, { marginTop: -8, marginBottom: 8 }]}
            >
              <Text style={[styles.label, { color: colors.textPrimary }]}>
                Tax Amount (%)
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.background,
                    color: colors.textPrimary,
                    borderColor: colors.cardBorder,
                  },
                ]}
                value={String(formData.tax_amount || "")}
                onChangeText={(text) => handleChange("tax_amount", text)}
                keyboardType="numeric"
                placeholder="0.00"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          )}

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>
                Sales Price
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.background,
                    color: colors.textPrimary,
                    borderColor: colors.cardBorder,
                  },
                ]}
                value={String(formData.list_price || "")}
                onChangeText={(text) => handleChange("list_price", text)}
                keyboardType="numeric"
                placeholder="0.00"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={{ width: 12 }} />
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>
                Cost
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.background,
                    color: colors.textPrimary,
                    borderColor: colors.cardBorder,
                  },
                ]}
                value={String(formData.standard_price || "")}
                onChangeText={(text) => handleChange("standard_price", text)}
                keyboardType="numeric"
                placeholder="0.00"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          </View>

          <View style={{ marginTop: 8 }}>
            <Text
              style={[
                styles.label,
                { color: colors.textPrimary, marginBottom: 8 },
              ]}
            >
              Category / Department
            </Text>
            <TouchableOpacity
              style={[
                styles.selectorBtn,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.cardBorder,
                },
              ]}
              onPress={() => setCategoryModalVisible(true)}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
              >
                <Ionicons
                  name="folder-outline"
                  size={24}
                  color={colors.primary}
                />
                <Text
                  style={[
                    styles.selectorText,
                    {
                      color: formData.categ_id
                        ? colors.textPrimary
                        : colors.textSecondary,
                    },
                  ]}
                >
                  {formData.categ_id
                    ? formData.categ_id[1]
                    : "Select category..."}
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            Inventory and Codes
          </Text>

          {!isNew && (
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>
                On Hand Quantity
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.background,
                    color: colors.textPrimary,
                    borderColor:
                      qtyAvailable !== originalQty
                        ? colors.primary
                        : colors.cardBorder,
                  },
                ]}
                value={String(qtyAvailable)}
                onChangeText={(text) => setQtyAvailable(Number(text) || 0)}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={colors.textSecondary}
              />
              {qtyAvailable !== originalQty && (
                <Text
                  style={{ fontSize: 12, color: colors.primary, marginTop: 2 }}
                >
                  Will update stock: {originalQty} → {qtyAvailable}
                </Text>
              )}
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>
              Internal Reference
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.background,
                  color: colors.textPrimary,
                  borderColor: colors.cardBorder,
                },
              ]}
              value={formData.default_code as string}
              onChangeText={(text) => handleChange("default_code", text)}
              placeholder="e.g. REF-001"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>
              Barcode
            </Text>
            <View style={styles.barcodeContainer}>
              <TextInput
                style={[
                  styles.input,
                  styles.barcodeInput,
                  {
                    backgroundColor: colors.background,
                    color: colors.textPrimary,
                    borderColor: colors.cardBorder,
                  },
                ]}
                value={formData.barcode as string}
                onChangeText={(text) => handleChange("barcode", text)}
                placeholder="Scan or enter..."
                placeholderTextColor={colors.textSecondary}
              />
              <TouchableOpacity
                style={[styles.scanButton, { backgroundColor: colors.primary }]}
                onPress={() => setScannerVisible(true)}
              >
                <Ionicons name="barcode-outline" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>
              Product Type
            </Text>
            <View
              style={[
                styles.segmentedControl,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.cardBorder,
                },
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.segment,
                  formData.type === "consu" &&
                    formData.is_storable === true && {
                      backgroundColor: colors.primary,
                    },
                ]}
                onPress={() => {
                  handleChange("type", "consu");
                  handleChange("is_storable", true);
                }}
              >
                <Text
                  style={[
                    styles.segmentText,
                    {
                      color:
                        formData.type === "consu" &&
                        formData.is_storable === true
                          ? "#FFF"
                          : colors.textPrimary,
                    },
                  ]}
                >
                  Storable
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.segment,
                  formData.type === "consu" &&
                    formData.is_storable === false && {
                      backgroundColor: colors.primary,
                    },
                ]}
                onPress={() => {
                  handleChange("type", "consu");
                  handleChange("is_storable", false);
                }}
              >
                <Text
                  style={[
                    styles.segmentText,
                    {
                      color:
                        formData.type === "consu" &&
                        formData.is_storable === false
                          ? "#FFF"
                          : colors.textPrimary,
                    },
                  ]}
                >
                  Consumable
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.segment,
                  formData.type === "service" && {
                    backgroundColor: colors.primary,
                  },
                ]}
                onPress={() => {
                  handleChange("type", "service");
                  handleChange("is_storable", false);
                }}
              >
                <Text
                  style={[
                    styles.segmentText,
                    {
                      color:
                        formData.type === "service"
                          ? "#FFF"
                          : colors.textPrimary,
                    },
                  ]}
                >
                  Service
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            Restrictions & Benefits
          </Text>
          <View style={styles.switchRow}>
            <Text
              style={[styles.label, { color: colors.textPrimary, flex: 1 }]}
            >
              Food Stamp (EBT)
            </Text>
            <Switch
              value={formData.food_stamp}
              onValueChange={(val) => handleChange("food_stamp", val)}
              trackColor={{ false: colors.cardBorder, true: colors.primary }}
            />
          </View>
          <View style={styles.switchRow}>
            <Text
              style={[styles.label, { color: colors.textPrimary, flex: 1 }]}
            >
              WIC
            </Text>
            <Switch
              value={formData.wic}
              onValueChange={(val) => handleChange("wic", val)}
              trackColor={{ false: colors.cardBorder, true: colors.primary }}
            />
          </View>
          <View style={styles.switchRow}>
            <Text
              style={[styles.label, { color: colors.textPrimary, flex: 1 }]}
            >
              FSA
            </Text>
            <Switch
              value={formData.fsa}
              onValueChange={(val) => handleChange("fsa", val)}
              trackColor={{ false: colors.cardBorder, true: colors.primary }}
            />
          </View>
          <View style={styles.switchRow}>
            <Text
              style={[styles.label, { color: colors.textPrimary, flex: 1 }]}
            >
              Age Verification
            </Text>
            <Switch
              value={formData.age_verification}
              onValueChange={(val) => handleChange("age_verification", val)}
              trackColor={{ false: colors.cardBorder, true: colors.primary }}
            />
          </View>
        </View>

        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            Price & Scale
          </Text>
          <View style={styles.switchRow}>
            <Text
              style={[styles.label, { color: colors.textPrimary, flex: 1 }]}
            >
              Is Scalable (Scale)
            </Text>
            <Switch
              value={formData.scalable}
              onValueChange={(val) => handleChange("scalable", val)}
              trackColor={{ false: colors.cardBorder, true: colors.primary }}
            />
          </View>
          <View style={styles.switchRow}>
            <Text
              style={[styles.label, { color: colors.textPrimary, flex: 1 }]}
            >
              Open Price
            </Text>
            <Switch
              value={formData.open_price}
              onValueChange={(val) => handleChange("open_price", val)}
              trackColor={{ false: colors.cardBorder, true: colors.primary }}
            />
          </View>
          <View style={styles.switchRow}>
            <Text
              style={[styles.label, { color: colors.textPrimary, flex: 1 }]}
            >
              Prefix Price
            </Text>
            <Switch
              value={formData.prefix_price}
              onValueChange={(val) => handleChange("prefix_price", val)}
              trackColor={{ false: colors.cardBorder, true: colors.primary }}
            />
          </View>
          <View style={styles.switchRow}>
            <Text
              style={[styles.label, { color: colors.textPrimary, flex: 1 }]}
            >
              Rollup Pricing
            </Text>
            <Switch
              value={formData.rollup_pricing}
              onValueChange={(val) => handleChange("rollup_pricing", val)}
              trackColor={{ false: colors.cardBorder, true: colors.primary }}
            />
          </View>
          <View style={styles.switchRow}>
            <Text
              style={[styles.label, { color: colors.textPrimary, flex: 1 }]}
            >
              Weight Format
            </Text>
            <Switch
              value={formData.wt_format}
              onValueChange={(val) => handleChange("wt_format", val)}
              trackColor={{ false: colors.cardBorder, true: colors.primary }}
            />
          </View>
          <View style={styles.switchRow}>
            <Text
              style={[styles.label, { color: colors.textPrimary, flex: 1 }]}
            >
              Mix & Match
            </Text>
            <Switch
              value={formData.mix_and_match}
              onValueChange={(val) => handleChange("mix_and_match", val)}
              trackColor={{ false: colors.cardBorder, true: colors.primary }}
            />
          </View>
        </View>

        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            Promotions and Modifiers
          </Text>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>
              Promotion Description
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.background,
                  color: colors.textPrimary,
                  borderColor: colors.cardBorder,
                },
              ]}
              value={formData.promotion_description as string}
              onChangeText={(text) =>
                handleChange("promotion_description", text)
              }
              placeholder="e.g. 2x1 on Drinks"
              placeholderTextColor={colors.textSecondary}
            />
          </View>
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>
                Prom. Qty
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.background,
                    color: colors.textPrimary,
                    borderColor: colors.cardBorder,
                  },
                ]}
                value={String(formData.promotion_qty || "")}
                onChangeText={(text) => handleChange("promotion_qty", text)}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={{ width: 12 }} />
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>
                Prom. Price
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.background,
                    color: colors.textPrimary,
                    borderColor: colors.cardBorder,
                  },
                ]}
                value={String(formData.promotion_price || "")}
                onChangeText={(text) => handleChange("promotion_price", text)}
                keyboardType="numeric"
                placeholder="0.00"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          </View>
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>
                Modifier 1
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.background,
                    color: colors.textPrimary,
                    borderColor: colors.cardBorder,
                  },
                ]}
                value={formData.modifier_1 as string}
                onChangeText={(text) => handleChange("modifier_1", text)}
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={{ width: 12 }} />
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>
                Modifier 2
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.background,
                    color: colors.textPrimary,
                    borderColor: colors.cardBorder,
                  },
                ]}
                value={formData.modifier_2 as string}
                onChangeText={(text) => handleChange("modifier_2", text)}
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          </View>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>
              Modifier 3
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.background,
                  color: colors.textPrimary,
                  borderColor: colors.cardBorder,
                },
              ]}
              value={formData.modifier_3 as string}
              onChangeText={(text) => handleChange("modifier_3", text)}
              placeholderTextColor={colors.textSecondary}
            />
          </View>
        </View>

        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            Kitchen and Printing
          </Text>
          <View style={styles.switchRow}>
            <Text
              style={[styles.label, { color: colors.textPrimary, flex: 1 }]}
            >
              Kitchen Printing
            </Text>
            <Switch
              value={formData.is_kitchen}
              onValueChange={(val) => handleChange("is_kitchen", val)}
              trackColor={{ false: colors.cardBorder, true: colors.primary }}
            />
          </View>
          <View style={styles.switchRow}>
            <Text
              style={[styles.label, { color: colors.textPrimary, flex: 1 }]}
            >
              Office Copy
            </Text>
            <Switch
              value={formData.office_copy}
              onValueChange={(val) => handleChange("office_copy", val)}
              trackColor={{ false: colors.cardBorder, true: colors.primary }}
            />
          </View>
          <View style={styles.switchRow}>
            <Text
              style={[styles.label, { color: colors.textPrimary, flex: 1 }]}
            >
              Print 1
            </Text>
            <Switch
              value={formData.print1}
              onValueChange={(val) => handleChange("print1", val)}
              trackColor={{ false: colors.cardBorder, true: colors.primary }}
            />
          </View>
          <View style={styles.switchRow}>
            <Text
              style={[styles.label, { color: colors.textPrimary, flex: 1 }]}
            >
              Print 2
            </Text>
            <Switch
              value={formData.print2}
              onValueChange={(val) => handleChange("print2", val)}
              trackColor={{ false: colors.cardBorder, true: colors.primary }}
            />
          </View>
          <View style={styles.switchRow}>
            <Text
              style={[styles.label, { color: colors.textPrimary, flex: 1 }]}
            >
              Print 3
            </Text>
            <Switch
              value={formData.print3}
              onValueChange={(val) => handleChange("print3", val)}
              trackColor={{ false: colors.cardBorder, true: colors.primary }}
            />
          </View>
          <View style={styles.switchRow}>
            <Text
              style={[styles.label, { color: colors.textPrimary, flex: 1 }]}
            >
              Print 4
            </Text>
            <Switch
              value={formData.print4}
              onValueChange={(val) => handleChange("print4", val)}
              trackColor={{ false: colors.cardBorder, true: colors.primary }}
            />
          </View>
        </View>

        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            Additional POS Attributes
          </Text>
          <View style={styles.switchRow}>
            <Text
              style={[styles.label, { color: colors.textPrimary, flex: 1 }]}
            >
              Family Code
            </Text>
            <Switch
              value={formData.family_code}
              onValueChange={(val) => handleChange("family_code", val)}
              trackColor={{ false: colors.cardBorder, true: colors.primary }}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>
                Margin
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.background,
                    color: colors.textPrimary,
                    borderColor: colors.cardBorder,
                  },
                ]}
                value={String(formData.margin || "")}
                onChangeText={(text) => handleChange("margin", text)}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={{ width: 12 }} />
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>
                Alert Quantity
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.background,
                    color: colors.textPrimary,
                    borderColor: colors.cardBorder,
                  },
                ]}
                value={String(formData.alert_quantity || "")}
                onChangeText={(text) => handleChange("alert_quantity", text)}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          </View>

          <View style={[styles.inputGroup, { marginTop: 8 }]}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>
              Group (Group ID)
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.background,
                  color: colors.textPrimary,
                  borderColor: colors.cardBorder,
                },
              ]}
              value={formData.group_id as string}
              onChangeText={(text) => handleChange("group_id", text)}
              placeholder="e.g. GENERIC"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginTop: 8 }]}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>
                Size
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.background,
                    color: colors.textPrimary,
                    borderColor: colors.cardBorder,
                  },
                ]}
                value={formData.size as string}
                onChangeText={(text) => handleChange("size", text)}
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={{ width: 12 }} />
            <View style={[styles.inputGroup, { flex: 1, marginTop: 8 }]}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>
                Brand
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.background,
                    color: colors.textPrimary,
                    borderColor: colors.cardBorder,
                  },
                ]}
                value={formData.brand as string}
                onChangeText={(text) => handleChange("brand", text)}
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginTop: 8 }]}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>
                Label
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.background,
                    color: colors.textPrimary,
                    borderColor: colors.cardBorder,
                  },
                ]}
                value={formData.label as string}
                onChangeText={(text) => handleChange("label", text)}
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={{ width: 12 }} />
            <View style={[styles.inputGroup, { flex: 1, marginTop: 8 }]}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>
                Label Desc.
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.background,
                    color: colors.textPrimary,
                    borderColor: colors.cardBorder,
                  },
                ]}
                value={formData.label_description as string}
                onChangeText={(text) => handleChange("label_description", text)}
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          </View>

          <View style={{ marginTop: 8 }}>
            <Text
              style={[
                styles.label,
                { color: colors.textPrimary, marginBottom: 8 },
              ]}
            >
              Related Product (Sibling Item)
            </Text>
            <TouchableOpacity
              style={[
                styles.selectorBtn,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.cardBorder,
                },
              ]}
              onPress={() => setProductModalVisible(true)}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
              >
                <Ionicons
                  name="link-outline"
                  size={24}
                  color={colors.primary}
                />
                <Text
                  style={[
                    styles.selectorText,
                    {
                      color: formData.sibling_item
                        ? colors.textPrimary
                        : colors.textSecondary,
                    },
                  ]}
                >
                  {formData.sibling_item
                    ? formData.sibling_item[1]
                    : "Select product..."}
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </View>
        </View>

        {!isNew && formData.print_label && (
          <View
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            <Text
              style={[styles.sectionTitle, { color: colors.textSecondary }]}
            >
              Label Status
            </Text>
            {formData.print_label ? (
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <View
                  style={[
                    styles.labelStatusBadge,
                    { backgroundColor: "#F59E0B20" },
                  ]}
                >
                  <Ionicons name="pricetag-outline" size={16} color="#F59E0B" />
                  <Text style={[styles.labelStatusText, { color: "#F59E0B" }]}>
                    ⚠️ Label Pending - Needs reprint
                  </Text>
                </View>
              </View>
            ) : (
              <View>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 4,
                  }}
                >
                  <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                  <Text
                    style={{
                      color: "#10B981",
                      fontSize: 14,
                      fontWeight: "600",
                    }}
                  >
                    Label OK - No pending print
                  </Text>
                </View>
                {(formData.last_label_price || formData.last_label_date) && (
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontSize: 13,
                      marginTop: 4,
                    }}
                  >
                    Last printed: $
                    {formData.last_label_price?.toFixed(2) || "N/A"}
                    {formData.last_label_date
                      ? ` on ${new Date(formData.last_label_date).toLocaleString()}`
                      : ""}
                  </Text>
                )}
              </View>
            )}
          </View>
        )}

        {!isNew && (
          <View
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            <Text
              style={[styles.sectionTitle, { color: colors.textSecondary }]}
            >
              Calculated Information (Read Only)
            </Text>

            <View style={styles.row}>
              <View style={styles.infoBox}>
                <Text
                  style={[styles.infoLabel, { color: colors.textSecondary }]}
                >
                  Forecasted Qty
                </Text>
                <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
                  {computedData.virtual_available}
                </Text>
              </View>
              <View style={styles.infoBox}>
                <Text
                  style={[styles.infoLabel, { color: colors.textSecondary }]}
                >
                  On Hand
                </Text>
                <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
                  {computedData.qty_available}
                </Text>
              </View>
              <View style={styles.infoBox}>
                <Text
                  style={[styles.infoLabel, { color: colors.textSecondary }]}
                >
                  Variants
                </Text>
                <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
                  {computedData.product_variant_count}
                </Text>
              </View>
            </View>

            <View style={[styles.infoBox, { marginTop: 12 }]}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                Category
              </Text>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
                {computedData.categ_name}
              </Text>
            </View>
          </View>
        )}

        {!isNew && (
          <TouchableOpacity
            style={[styles.deleteButton, { borderColor: "#EF4444" }]}
            onPress={handleDelete}
          >
            <Ionicons
              name="archive-outline"
              size={20}
              color="#EF4444"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.deleteButtonText}>Archive Product</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <ScannerModal
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onScan={(data) => {
          handleChange("barcode", data);
        }}
      />
      <CategorySelectorModal
        visible={categoryModalVisible}
        onClose={() => setCategoryModalVisible(false)}
        onSelect={(category) => {
          handleChange("categ_id", [category.id, category.name]);
          setSelectedCategoryData(category);
          // If follow_department is ON, inherit all shared POS fields immediately
          if (formData.follow_department) {
            applyDepartmentInheritance(category);
          }
        }}
      />
      <ProductSelectorModal
        visible={productModalVisible}
        onClose={() => setProductModalVisible(false)}
        onSelect={(product) => {
          handleChange("sibling_item", [product.id, product.name]);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  backButton: {
    padding: 4,
  },
  saveButton: {
    padding: 4,
    minWidth: 60,
    alignItems: "flex-end",
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  imageContainer: {
    alignItems: "center",
    marginBottom: 8,
  },
  productImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#E5E7EB",
  },
  genericImageContainer: {
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  barcodeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  barcodeInput: {
    flex: 1,
  },
  scanButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  segmentedControl: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 8,
    overflow: "hidden",
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
  },
  segmentText: {
    fontSize: 14,
    fontWeight: "500",
  },
  infoBox: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "600",
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  deleteButtonText: {
    color: "#EF4444",
    fontSize: 16,
    fontWeight: "600",
  },
  labelStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  labelStatusText: {
    fontSize: 14,
    fontWeight: "600",
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  selectorBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
  },
  selectorText: {
    fontSize: 15,
    fontWeight: "500",
  },
});
